const { createNotification } = require('../utils/notifications');
const {
  SLA_RULES,
  TERMINAL_STATUSES,
  getDeadlineHours,
  getSimulatedNow
} = require('../utils/sla');

const DEFAULT_MAX_SIZE = 1000;
const DEFAULT_INTERVAL_MS = 5 * 60 * 1000;
const ACTIVE_STATUSES = ['Submitted', 'Under Review', 'Assigned', 'In Progress', 'Awaiting Materials', 'Escalated', 'Reopened'];

let activeScheduler = null;

const toTime = (value) => {
  const time = value instanceof Date ? value.getTime() : new Date(value).getTime();
  return Number.isFinite(time) ? time : Date.now();
};

const getComplaintDeadline = (complaint) => {
  if (complaint.deadline) return new Date(complaint.deadline);
  if (complaint.sla_deadline) return new Date(complaint.sla_deadline);

  const createdAt = complaint.created_at || new Date();
  return new Date(toTime(createdAt) + getDeadlineHours(complaint.priority) * 60 * 60 * 1000);
};

const notificationPriorityForComplaint = (priority) => {
  if (priority === 'Critical') return 'Urgent';
  if (priority === 'High') return 'Important';
  return 'Normal';
};

class ComplaintMinHeap {
  constructor(maxSize = DEFAULT_MAX_SIZE) {
    this.maxSize = maxSize;
    this.items = [];
    this.indexes = new Map();
  }

  get size() {
    return this.items.length;
  }

  isEmpty() {
    return this.items.length === 0;
  }

  peek() {
    return this.items[0] || null;
  }

  clear() {
    this.items = [];
    this.indexes.clear();
  }

  insert(complaint) {
    const queuedComplaint = {
      ...complaint,
      deadline: getComplaintDeadline(complaint)
    };

    if (this.indexes.has(queuedComplaint.id)) {
      this.remove(queuedComplaint.id);
    }

    if (this.items.length >= this.maxSize) {
      throw new Error(`Escalation heap max size ${this.maxSize} exceeded`);
    }

    this.items.push(queuedComplaint);
    const index = this.items.length - 1;
    this.indexes.set(queuedComplaint.id, index);
    this.heapifyUp(index);
    return queuedComplaint;
  }

  extractMin() {
    if (this.items.length === 0) return null;

    const minComplaint = this.items[0];
    const lastComplaint = this.items.pop();
    this.indexes.delete(minComplaint.id);

    if (this.items.length > 0) {
      this.items[0] = lastComplaint;
      this.indexes.set(lastComplaint.id, 0);
      this.heapifyDown(0);
    }

    return minComplaint;
  }

  remove(complaintId) {
    if (!this.indexes.has(complaintId)) return null;

    const index = this.indexes.get(complaintId);
    const removed = this.items[index];
    const lastComplaint = this.items.pop();
    this.indexes.delete(complaintId);

    if (index < this.items.length) {
      this.items[index] = lastComplaint;
      this.indexes.set(lastComplaint.id, index);
      this.heapifyDown(index);
      this.heapifyUp(this.indexes.get(lastComplaint.id));
    }

    return removed;
  }

  heapifyUp(index) {
    let currentIndex = index;
    while (currentIndex > 0) {
      const parentIndex = Math.floor((currentIndex - 1) / 2);
      if (this.compare(this.items[parentIndex], this.items[currentIndex]) <= 0) break;
      this.swap(parentIndex, currentIndex);
      currentIndex = parentIndex;
    }
  }

  heapifyDown(index) {
    let currentIndex = index;
    while (true) {
      const leftChild = 2 * currentIndex + 1;
      const rightChild = 2 * currentIndex + 2;
      let smallest = currentIndex;

      if (
        leftChild < this.items.length &&
        this.compare(this.items[leftChild], this.items[smallest]) < 0
      ) {
        smallest = leftChild;
      }

      if (
        rightChild < this.items.length &&
        this.compare(this.items[rightChild], this.items[smallest]) < 0
      ) {
        smallest = rightChild;
      }

      if (smallest === currentIndex) break;
      this.swap(smallest, currentIndex);
      currentIndex = smallest;
    }
  }

  compare(a, b) {
    const deadlineDelta = toTime(a.deadline) - toTime(b.deadline);
    if (deadlineDelta !== 0) return deadlineDelta;
    return String(a.id).localeCompare(String(b.id));
  }

  swap(aIndex, bIndex) {
    const temp = this.items[aIndex];
    this.items[aIndex] = this.items[bIndex];
    this.items[bIndex] = temp;
    this.indexes.set(this.items[aIndex].id, aIndex);
    this.indexes.set(this.items[bIndex].id, bIndex);
  }
}

class EscalationScheduler {
  constructor(db, options = {}) {
    this.db = db;
    this.heap = new ComplaintMinHeap(options.maxSize || Number(process.env.ESCALATION_HEAP_MAX_SIZE) || DEFAULT_MAX_SIZE);
    this.intervalMs = options.intervalMs || Number(process.env.ESCALATION_INTERVAL_MS) || DEFAULT_INTERVAL_MS;
    this.timer = null;
    this.running = false;
  }

  async buildHeap() {
    this.heap.clear();
    const [complaints] = await this.db.query(
      `SELECT id, department_id, current_hierarchy_level_id, assigned_officer_id,
        status, priority, created_at, sla_deadline
       FROM complaints
       WHERE is_trashed = FALSE
         AND sla_breached = FALSE
         AND status IN (?)`,
      [ACTIVE_STATUSES]
    );

    for (const complaint of complaints) {
      this.heap.insert(complaint);
    }

    return this.heap.size;
  }

  start() {
    if (this.timer) return;

    this.timer = setInterval(() => {
      this.runDueEscalations().catch((err) => {
        console.error('Escalation scheduler error:', err);
      });
    }, this.intervalMs);

    if (typeof this.timer.unref === 'function') {
      this.timer.unref();
    }
  }

  stop() {
    if (!this.timer) return;
    clearInterval(this.timer);
    this.timer = null;
  }

  async syncComplaintById(complaintId) {
    const [complaints] = await this.db.query(
      `SELECT id, department_id, current_hierarchy_level_id, assigned_officer_id,
        status, priority, created_at, sla_deadline, sla_breached, is_trashed
       FROM complaints
       WHERE id = ?`,
      [complaintId]
    );

    if (complaints.length === 0) {
      this.heap.remove(complaintId);
      return false;
    }

    const complaint = complaints[0];
    if (
      complaint.is_trashed ||
      complaint.sla_breached ||
      TERMINAL_STATUSES.includes(complaint.status) ||
      !ACTIVE_STATUSES.includes(complaint.status)
    ) {
      this.heap.remove(complaintId);
      return false;
    }

    this.heap.insert(complaint);
    return true;
  }

  removeComplaint(complaintId) {
    return this.heap.remove(complaintId);
  }

  async runDueEscalations() {
    if (this.running) return 0;

    this.running = true;
    let escalatedCount = 0;

    try {
      const currentTime = getSimulatedNow();
      while (!this.heap.isEmpty()) {
        const topComplaint = this.heap.peek();
        if (toTime(topComplaint.deadline) > currentTime.getTime()) break;

        const complaint = this.heap.extractMin();
        const escalated = await this.escalateComplaint(complaint.id);
        if (escalated) {
          escalatedCount += 1;
        } else {
          await this.syncComplaintById(complaint.id);
        }
      }
    } finally {
      this.running = false;
    }

    return escalatedCount;
  }

  async escalateComplaint(complaintId) {
    const connection = await this.db.getConnection();

    try {
      await connection.beginTransaction();

      const [complaints] = await connection.query(
        `SELECT id, department_id, current_hierarchy_level_id, assigned_officer_id,
          user_id, status, priority, sla_deadline, sla_breached, is_trashed
         FROM complaints
         WHERE id = ?
         FOR UPDATE`,
        [complaintId]
      );

      if (complaints.length === 0) {
        await connection.rollback();
        return false;
      }

      const complaint = complaints[0];
      const deadline = getComplaintDeadline(complaint);
      if (
        complaint.is_trashed ||
        complaint.sla_breached ||
        TERMINAL_STATUSES.includes(complaint.status) ||
        toTime(deadline) > getSimulatedNow().getTime()
      ) {
        await connection.rollback();
        return false;
      }

      const [rules] = await connection.query(
        `SELECT id, target_level_id
         FROM escalation_rules
         WHERE department_id = ?
           AND hierarchy_level_id = ?
         LIMIT 1`,
        [complaint.department_id, complaint.current_hierarchy_level_id]
      );

      if (rules.length === 0) {
        await this.markComplaintBreached(connection, complaint, 'No escalation rule defined for this hierarchy level.');
        await connection.commit();
        return true;
      }

      const rule = rules[0];
      const [officers] = await connection.query(
        `SELECT o.id, COUNT(c.id) as active_complaints
         FROM officers o
         LEFT JOIN complaints c
           ON c.assigned_officer_id = o.id
           AND c.is_trashed = FALSE
           AND c.status NOT IN (?)
         WHERE o.status = 'Active'
           AND o.role != 'Admin'
           AND o.department_id = ?
           AND o.hierarchy_level_id = ?
         GROUP BY o.id
         ORDER BY active_complaints ASC, o.created_at ASC
         LIMIT 1`,
        [TERMINAL_STATUSES, complaint.department_id, rule.target_level_id]
      );

      if (officers.length === 0) {
        await this.markComplaintBreached(
          connection,
          complaint,
          `No active officer available at target level ${rule.target_level_id}.`
        );
        await connection.commit();
        return true;
      }

      const targetOfficer = officers[0];
      await connection.query(
        `UPDATE complaints
         SET assigned_officer_id = ?,
             current_hierarchy_level_id = ?,
             status = 'Escalated',
             sla_breached = TRUE,
             updated_at = NOW()
         WHERE id = ?`,
        [targetOfficer.id, rule.target_level_id, complaint.id]
      );

      await connection.query(
        `INSERT INTO complaint_history (complaint_id, action, actor, details)
         VALUES (?, ?, ?, ?)`,
        [
          complaint.id,
          'Escalated due to SLA breach',
          'System',
          `Reassigned to level ${rule.target_level_id}`
        ]
      );

      await createNotification(connection, {
        title: 'Complaint Escalated',
        message: `Complaint ${complaint.id} has been escalated due to SLA breach.`,
        target: 'Officers',
        recipientType: 'Officer',
        recipientId: targetOfficer.id,
        priority: notificationPriorityForComplaint(complaint.priority)
      });

      await createNotification(connection, {
        title: 'Complaint Escalated',
        message: `Your complaint ${complaint.id} has been escalated due to SLA breach.`,
        target: 'Users',
        recipientType: 'User',
        recipientId: complaint.user_id,
        priority: 'Important'
      });

      await connection.commit();
      return true;
    } catch (err) {
      await connection.rollback();
      throw err;
    } finally {
      connection.release();
    }
  }

  async markComplaintBreached(connection, complaint, details) {
    await connection.query(
      `UPDATE complaints
       SET status = 'Escalated',
           sla_breached = TRUE,
           updated_at = NOW()
       WHERE id = ?`,
      [complaint.id]
    );

    await connection.query(
      `INSERT INTO complaint_history (complaint_id, action, actor, details)
       VALUES (?, ?, ?, ?)`,
      [complaint.id, 'Escalated due to SLA breach', 'System', details]
    );

    await createNotification(connection, {
      title: 'Complaint Escalated',
      message: `Complaint ${complaint.id} has been escalated due to SLA breach. ${details}`,
      target: 'Officers',
      priority: notificationPriorityForComplaint(complaint.priority)
    });

    await createNotification(connection, {
      title: 'Complaint Escalated',
      message: `Your complaint ${complaint.id} has been escalated due to SLA breach.`,
      target: 'Users',
      recipientType: 'User',
      recipientId: complaint.user_id,
      priority: 'Important'
    });
  }
}

const createEscalationScheduler = (db, options) => new EscalationScheduler(db, options);

const setEscalationScheduler = (scheduler) => {
  activeScheduler = scheduler;
};

const getEscalationScheduler = () => activeScheduler;

module.exports = {
  ACTIVE_STATUSES,
  ComplaintMinHeap,
  EscalationScheduler,
  createEscalationScheduler,
  getComplaintDeadline,
  getEscalationScheduler,
  notificationPriorityForComplaint,
  setEscalationScheduler
};
