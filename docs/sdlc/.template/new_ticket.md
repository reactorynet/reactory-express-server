# Ticket: <%= ticket_id %>

**Title:** <%= title %>

**Type:** <%= type %>

**Priority:** <%= priority %>

**Reporter:** <%= reporter %>

**Assignee:** <%= assignee %>

**Description:**

<%= description %>

**Acceptance Criteria:**

<% acceptance_criteria.forEach(function(criterion, index) { %>
<%= index + 1 %>. <%= criterion %>
<% }); %>

**Sub-Tasks:**

<% sub_tasks.forEach(function(task, index) { %>
<%= index + 1 %>. <%= task %>
<% }); %>

**Suggested Solutions:**

<% suggested_solutions.forEach(function(solution, index) { %>
<%= index + 1 %>. <%= solution %>
<% }); %>

**Labels:** <%= labels.join(', ') %>

**Due Date:** <%= due_date %>

**Sources:**

<% sources.forEach(function(source) { %>
<%= source %>
<% }); %>

**Comments:**

<%= comments %>