import { supabase } from './supabase';

export type Priority = 'Low' | 'Medium' | 'High';
export type Category = 'Personal' | 'College' | 'Work' | 'Projects' | 'Other';
export type TaskStatus = 'Pending' | 'Completed';
export type Task = {
  id: string;
  user_id: string;
  title: string;
  description: string;
  due_date: string | null;
  due_time: string | null;
  priority: Priority;
  category: Category;
  status: TaskStatus;
  reminder_enabled: boolean;
  created_at: string;
  updated_at: string;
};
export type TaskInput = Omit<Task, 'id' | 'created_at' | 'updated_at' | 'status'> & { status?: TaskStatus };
const table = 'tasks';

function taskFailure(action: string, error: unknown): Error {
  const details = error as { code?: string; message?: string } | null;
  const message = details?.message?.toLowerCase() ?? '';
  const schemaMissing =
    details?.code === '42P01' ||
    details?.code === 'PGRST205' ||
    message.includes('schema cache') ||
    message.includes('relation') && message.includes('does not exist');

  return new Error(
    schemaMissing
      ? `Could not ${action}: Supabase task tables are not set up yet. Run the SQL in supabase/schema.sql.`
      : `Could not ${action}. Check your connection and Supabase access, then try again.`,
  );
}

export function localDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export async function getTasks(userId: string): Promise<Task[]> {
  if (!supabase) throw new Error('Supabase is not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to continue.');
  const { data, error } = await supabase.from(table).select('*').eq('user_id', userId).order('created_at', { ascending: false });
  if (error) throw taskFailure('load tasks', error);
  return (data ?? []) as Task[];
}
export async function createTask(input: TaskInput): Promise<Task> {
  if (!supabase) throw new Error('Supabase is not configured.');
  const normalized = {
    ...input,
    due_date: input.due_date || null,
    due_time: input.due_time || null,
    description: input.description ?? '',
    status: input.status ?? 'Pending',
  };
  const { data, error } = await supabase.from(table).insert(normalized).select().single();
  if (error) throw taskFailure('create task', error);
  return data as Task;
}
export async function updateTask(id: string, patch: Partial<TaskInput>): Promise<Task> {
  if (!supabase) throw new Error('Supabase is not configured.');
  const normalized: Partial<TaskInput> & { updated_at: string } = {
    ...patch,
    updated_at: new Date().toISOString(),
  };
  if ('due_date' in patch) normalized.due_date = patch.due_date || null;
  if ('due_time' in patch) normalized.due_time = patch.due_time || null;
  if ('description' in patch) normalized.description = patch.description ?? '';
  const { data, error } = await supabase.from(table).update(normalized).eq('id', id).select().single();
  if (error) throw taskFailure('save task changes', error);
  return data as Task;
}
export async function deleteTask(id: string): Promise<void> {
  if (!supabase) throw new Error('Supabase is not configured.');
  const { error } = await supabase.from(table).delete().eq('id', id);
  if (error) throw taskFailure('delete task', error);
}
export async function toggleTaskStatus(task: Task): Promise<Task> {
  return updateTask(task.id, { status: task.status === 'Completed' ? 'Pending' : 'Completed' });
}
export function getTaskStatistics(tasks: Task[]) {
  const day = localDateKey(new Date());
  const pending = tasks.filter((t) => t.status === 'Pending');
  const completed = tasks.filter((t) => t.status === 'Completed');
  const overdue = pending.filter((t) => t.due_date && t.due_date < day);
  const today = pending.filter((t) => t.due_date === day);
  return { total: tasks.length, pending: pending.length, completed: completed.length, overdue: overdue.length, today: today.length, completion: tasks.length ? Math.round(completed.length / tasks.length * 100) : 0 };
}