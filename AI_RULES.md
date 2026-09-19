# AI DEVELOPMENT RULES

Project: English Flashcard Learning System

## Architecture

Frontend:
- React
- Vite
- Axios

Backend:
- Node.js
- Express
- REST API

Database:
- MySQL

## Rules

1. Never connect React directly to MySQL.

2. Frontend must communicate with backend through REST API.

3. Never change database schema unless explicitly requested.

4. Never create a new table without asking.

5. Do not delete existing working code unnecessarily.

6. Do not rewrite the entire project when fixing one bug.

7. Follow the existing project structure.

8. Use environment variables for configuration.

9. Never hard-code database passwords.

10. Password must be hashed using bcrypt.

11. Authentication uses JWT.

12. Validate request data.

13. Use prepared SQL statements.

14. Handle errors properly.

15. Do not expose password_hash in API responses.

16. Do not invent API endpoints.

17. Before using an endpoint, check backend routes.

18. Use reusable React components.

19. Do not put everything in App.jsx.

20. Keep business logic outside UI components when possible.

21. When modifying a file, explain what was changed.

22. When fixing an error, identify the root cause first.

23. Do not change unrelated files.

24. After each major feature, provide commands to test it.

25. If something is unclear, ask before making a destructive architectural change.