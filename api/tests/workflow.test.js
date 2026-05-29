const assert = require('assert');

const adminTransitions = {
  Submitted: ['Under Review', 'Rejected', 'Closed'],
  'Under Review': ['Assigned', 'Rejected', 'Closed'],
  Assigned: ['In Progress', 'Awaiting Materials', 'Escalated', 'Resolved', 'Rejected', 'Closed'],
  'In Progress': ['Awaiting Materials', 'Escalated', 'Resolved', 'Rejected', 'Closed'],
  'Awaiting Materials': ['In Progress', 'Escalated', 'Resolved', 'Rejected', 'Closed'],
  Escalated: ['Assigned', 'In Progress', 'Awaiting Materials', 'Resolved', 'Rejected', 'Closed'],
  Reopened: ['Assigned', 'In Progress', 'Awaiting Materials', 'Escalated', 'Resolved', 'Rejected', 'Closed'],
  Resolved: ['Closed'],
  Closed: [],
  Rejected: [],
  Withdrawn: []
};

const officerTransitions = {
  Assigned: ['In Progress', 'Awaiting Materials', 'Resolved', 'Rejected'],
  'In Progress': ['Awaiting Materials', 'Resolved', 'Rejected'],
  'Awaiting Materials': ['In Progress', 'Resolved', 'Rejected'],
  Reopened: ['In Progress', 'Awaiting Materials', 'Resolved', 'Rejected'],
  Escalated: [],
  Resolved: [],
  Closed: [],
  Rejected: [],
  Withdrawn: []
};

const userWithdrawStatuses = ['Submitted', 'Under Review', 'Assigned', 'In Progress', 'Awaiting Materials', 'Escalated', 'Reopened'];
const userMaterialResponseStatuses = ['Awaiting Materials'];
const terminalStatuses = ['Resolved', 'Closed', 'Rejected', 'Withdrawn'];

const can = (map, from, to) => (map[from] || []).includes(to);

assert(can(adminTransitions, 'Submitted', 'Under Review'));
assert(can(adminTransitions, 'Under Review', 'Assigned'));
assert(can(adminTransitions, 'Awaiting Materials', 'In Progress'));
assert(can(adminTransitions, 'Resolved', 'Closed'));
assert(can(adminTransitions, 'Reopened', 'In Progress'));
assert(!can(adminTransitions, 'Closed', 'In Progress'));
assert(!can(adminTransitions, 'Rejected', 'Assigned'));
assert(!can(adminTransitions, 'Withdrawn', 'Assigned'));

assert(can(officerTransitions, 'Assigned', 'In Progress'));
assert(can(officerTransitions, 'In Progress', 'Awaiting Materials'));
assert(can(officerTransitions, 'Awaiting Materials', 'In Progress'));
assert(can(officerTransitions, 'Reopened', 'In Progress'));
assert(!can(officerTransitions, 'Escalated', 'Resolved'));
assert(!can(officerTransitions, 'Rejected', 'Resolved'));
assert(!can(officerTransitions, 'Withdrawn', 'In Progress'));

assert(userWithdrawStatuses.includes('Reopened'));
assert(!userWithdrawStatuses.includes('Resolved'));
assert(!userWithdrawStatuses.includes('Rejected'));
assert(userMaterialResponseStatuses.includes('Awaiting Materials'));
assert(!userMaterialResponseStatuses.includes('In Progress'));
assert(terminalStatuses.includes('Withdrawn'));

console.log('Complaint workflow transition tests passed.');
