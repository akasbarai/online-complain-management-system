const assert = require('assert');
const {
  ComplaintMinHeap,
  getComplaintDeadline,
  notificationPriorityForComplaint
} = require('../services/escalationScheduler');
const { getDeadlineHours } = require('../utils/sla');

const baseTime = new Date('2026-05-28T00:00:00.000Z');

const complaint = (id, priority, createdAt = baseTime) => ({
  id,
  priority,
  created_at: createdAt
});

const heap = new ComplaintMinHeap(10);
heap.insert(complaint('medium', 'Medium'));
heap.insert(complaint('critical', 'Critical'));
heap.insert(complaint('low', 'Low'));
heap.insert(complaint('high', 'High'));

assert.strictEqual(heap.extractMin().id, 'critical');
assert.strictEqual(heap.extractMin().id, 'high');

heap.insert({
  ...complaint('low', 'Low'),
  sla_deadline: new Date('2026-05-28T01:00:00.000Z')
});

assert.strictEqual(heap.extractMin().id, 'low');

heap.remove('medium');
assert.strictEqual(heap.extractMin(), null);

assert.strictEqual(getDeadlineHours('Critical'), 24);
assert.strictEqual(getDeadlineHours('Unknown'), 72);
assert.strictEqual(notificationPriorityForComplaint('Critical'), 'Urgent');
assert.strictEqual(notificationPriorityForComplaint('High'), 'Important');
assert.strictEqual(notificationPriorityForComplaint('Medium'), 'Normal');

const deadline = getComplaintDeadline(complaint('deadline', 'Low', baseTime));
assert.strictEqual(deadline.toISOString(), '2026-06-02T00:00:00.000Z');

console.log('Escalation heap tests passed.');
