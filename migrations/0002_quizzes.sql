create table quizzes (
  id uuid primary key,
  teacher_key_hash text not null,
  paper jsonb not null
);

create table quiz_attempts (
  quiz_id uuid not null references quizzes(id),
  id uuid not null,
  result jsonb not null,
  submitted_at bigint not null,
  primary key (quiz_id, id)
);

create index quiz_attempts_history on quiz_attempts (quiz_id, submitted_at desc);
