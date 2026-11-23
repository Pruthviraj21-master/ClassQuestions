# ClassQuestions

ClassQuestions (Patra) creates question papers from teacher notes, exports
student and teacher PDFs, and runs shareable quizzes with a private class
results dashboard.

## Development

Install dependencies with `npm ci` and start the app with `npm run dev`.
Use `npm run typecheck` and `npm run build` to check the project.

## Deployment

The full application uses TanStack Start server functions. Deploy it on Vercel
with a server-side `DATABASE_URL` for persistent quiz data. The build applies
the database migrations. Local development uses an in-memory database when
`DATABASE_URL` is unset.
