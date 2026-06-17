const STORAGE_KEY = 'crm_task_payments';

type PaymentRecord = Record<string, string>; // `${taskId}_${assigneeId}` → payment amount

function read(): PaymentRecord {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}');
  } catch {
    return {};
  }
}

function write(data: PaymentRecord): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {}
}

export const salaryCache = {
  setPayment(taskId: string, assigneeId: string, payment: string): void {
    const data = read();
    const key = `${taskId}_${assigneeId}`;
    if (payment && payment !== '0') {
      data[key] = payment;
    } else {
      delete data[key];
    }
    write(data);
  },

  getPayment(taskId: string, assigneeId: string): string | undefined {
    return read()[`${taskId}_${assigneeId}`];
  },
};
