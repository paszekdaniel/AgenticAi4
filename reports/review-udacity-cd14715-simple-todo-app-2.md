# 🔍 Code Review Report

## Summary

| Metric | Value |
|--------|-------|
| **Overall Score** | 25/100 |
| **Files Reviewed** | 1 |
| **Critical Issues** | 3 |
| **High Priority Tests** | 9 |
| **Refactoring Opportunities** | 5 |

## 🎯 Top Recommendations

1. 🚨 **security**: Fix SQL injection vulnerability in searchTodos function (line 120) by replacing direct string interpolation with parameterized queries. User-controlled keyword parameter allows arbitrary SQL execution.
   - Files: src/todo.ts

2. 🚨 **security**: Fix SQL injection vulnerability in searchTodosByStatus function (line 131) by replacing string concatenation with parameterized queries and validating the completed parameter.
   - Files: src/todo.ts

3. 🚨 **security**: Fix SQL injection vulnerability in getTodosByUser function (line 141) by replacing template literal injection with parameterized queries for the userId parameter.
   - Files: src/todo.ts

4. ⚠️ **testing**: Add comprehensive test coverage for the three vulnerable search functions to detect SQL injection attempts and verify correct parameterized query usage.
   - Files: src/todo.ts

5. ⚠️ **testing**: Add tests for validateTodoInput function to verify empty title rejection, title length limits (200 chars), and description length limits (1000 chars).
   - Files: src/todo.ts

## 📁 File Details

### 📄 `src/todo.ts`

**Quality Score:** 25/100 | **Coverage:** ~0%

#### Issues (10)
  - Line 120: `critical` SQL injection vulnerability: user-controlled keyword parameter is directly interpolated into the SQL query using template literals without parameterization. An attacker can inject arbitrary SQL by providing input like "' OR '1'='1" or "'; DROP TABLE todos; --" to extract data, modify records, or execute destructive commands.
  - Line 131: `critical` SQL injection vulnerability: the completed parameter is concatenated directly into the SQL query without validation or parameterization. An attacker can inject malicious SQL by passing input like "1 OR 1=1" or "1; DELETE FROM todos" to bypass authorization, extract all records, or execute arbitrary SQL commands.
  - Line 141: `critical` SQL injection vulnerability: userId is embedded in the SQL query via template literal with no sanitization or parameterization. An attacker can inject SQL by providing userId like "1' OR '1'='1" or "1'; DROP TABLE user_todos; --" to access unauthorized todos, exfiltrate data, or corrupt the database.

  *...and 7 more*

#### Test Gaps (15)
  - `src/todo.ts:119 (searchTodos)` (critical priority)
  - `src/todo.ts:129 (searchTodosByStatus)` (critical priority)

  *...and 13 more*

#### Refactoring Opportunities (5)
  - **extract-function**: The validation logic mixes three independent validation concerns (empty check, title length, description length) in a series of early returns. Each concern could be a named helper that expresses intent more clearly.
  - **pattern-improvement**: The HTML entity encoding uses four sequential replace calls with repeated method chaining. A lookup table with a single replace and a replacer function would centralize the mapping and reduce redundancy.

  *...and 3 more*

---

*Generated at 2026-11-02T10:29:08.930Z • Duration: 333719ms*
