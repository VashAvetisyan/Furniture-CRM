const fs = require('fs');
const content = fs.readFileSync('src/features/employees/components/EmployeeProfilePage.tsx', 'utf8');
const lines = content.split('\n');

// lines 201-302 (0-indexed 200-301) is the old SalaryTab
const before = lines.slice(0, 200).join('\n');
const after  = lines.slice(302).join('\n');

const newSalaryTab = `
// ── Salary tab ──────────────────────────────────────────────

function SalaryTab({ tasks, employeeId }: { tasks: TaskDTO[]; employeeId: string }) {
  const queryClient = useQueryClient();
  const [openId,    setOpenId]    = useState<string | null>(null);
  const [payAmount, setPayAmount] = useState('');
  const [partial,   setPartial]   = useState(false);

  const { mutate: markPaid, isPending: marking } = useMutation({
    mutationFn: ({ taskId, userId, amount, full }: {
      taskId: string; userId: number; amount: string; full: boolean;
    }) =>
      taskService.update(taskId, {
        assignees: [{
          user:          userId,
          salary_amount: amount,
          is_paid:       full,
          paid_at:       full ? new Date().toISOString().split('T')[0] : null,
        }],
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['tasks', employeeId] });
      setOpenId(null);
      setPartial(false);
    },
  });

  function getAssignee(t: TaskDTO) {
    return t.assignees?.find((a) => String(a.userId) === String(employeeId));
  }

  function getPayment(t: TaskDTO): number {
    const raw = getAssignee(t)?.salaryAmount
      || t.assigneePayment
      || (t.id ? salaryCache.getPayment(t.id, employeeId) : undefined)
      || '0';
    const v = parseFloat(String(raw).replace(/[^\d.]/g, ''));
    return isNaN(v) ? 0 : v;
  }

  function isPaid(t: TaskDTO): boolean {
    return getAssignee(t)?.isPaid ?? false;
  }

  function openPay(t: TaskDTO) {
    setPayAmount(String(getPayment(t)));
    setPartial(false);
    setOpenId(t.id ?? null);
  }

  function submit(t: TaskDTO, full: boolean) {
    const assignee = getAssignee(t);
    if (!assignee || !t.id) return;
    markPaid({ taskId: t.id, userId: assignee.userId, amount: payAmount, full });
  }

  const paid = tasks.filter((t) => getPayment(t) > 0);

  const total       = paid.reduce((sum, t) => sum + getPayment(t), 0);
  const paidTasks   = paid.filter((t) => isPaid(t));
  const unpaidTasks = paid.filter((t) => !isPaid(t));
  const totalPaid   = paidTasks.reduce((s, t) => s + getPayment(t), 0);
  const totalUnpaid = unpaidTasks.reduce((s, t) => s + getPayment(t), 0);

  return (
    <div className="flex flex-col gap-4">
      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-white rounded-2xl border border-crm-border p-4 shadow-sm">
          <p className="text-xs text-text-muted mb-1">Են\u564\u570\u561\u576\u578\u582\u580</p>
          <p className="text-2xl font-bold text-dark">{total.toLocaleString()} ֏</p>
          <p className="text-xs text-text-muted mt-1">{paid.length} պ\u561տվ\u587\u580</p>
        </div>
        <div className="bg-white rounded-2xl border border-crm-border p-4 shadow-sm">
          <p className="text-xs text-text-muted mb-1">Վճ\u561\u580վ\u561\u56e</p>
          <p className="text-2xl font-bold text-success">{totalPaid.toLocaleString()} ֏</p>
          <p className="text-xs text-text-muted mt-1">{paidTasks.length} պ\u561տվ\u587\u580</p>
        </div>
        <div className="bg-white rounded-2xl border border-crm-border p-4 shadow-sm">
          <p className="text-xs text-text-muted mb-1">չվճ\u561\u580վ\u561\u56e</p>
          <p className="text-2xl font-bold text-warning">{totalUnpaid.toLocaleString()} ֏</p>
          <p className="text-xs text-text-muted mt-1">{unpaidTasks.length} պ\u561տվ\u587\u580</p>
        </div>
      </div>

      {/* Task list */}
      {paid.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-48 bg-white rounded-2xl border border-crm-border gap-3 shadow-sm">
          <svg className="w-10 h-10 text-gray-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/>
          </svg>
          <p className="text-sm text-text-muted">Ա\u577խ\u561տ\u561վ\u561\u580\u581ի վ\u680\u561 տ\u561սկ-\u587\u580 \u579ի \u563տ\u576վ\u587լ</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-crm-border shadow-sm overflow-hidden">
          {/* Header */}
          <div className="grid grid-cols-[1fr_110px_90px_100px_130px] gap-3 px-5 py-3 bg-gray-50 border-b border-crm-border">
            <span className="text-xs font-semibold text-text-muted">Պ\u561տվ\u587\u580</span>
            <span className="text-xs font-semibold text-text-muted">Ռ\u587\u580\u57b\u576\u561ժ\u561\u574կ\u587տ</span>
            <span className="text-xs font-semibold text-text-muted">Կ\u561\u580\u587\u57e\u578\u580\u578\u582\u569</span>
            <span className="text-xs font-semibold text-text-muted text-right">Գ\u578\u582\u574\u561\u580</span>
            <span className="text-xs font-semibold text-text-muted text-center">Վճ\u561\u580\u578\u582\u574</span>
          </div>

          {paid.map((t) => {
            const status   = STATUS_LABELS[t.status] ?? { label: t.status, cls: 'bg-gray-100 text-gray-500' };
            const taskPaid = isPaid(t);
            const isOpen   = openId === t.id;
            const amount   = getPayment(t);

            return (
              <div key={t.id} className="border-b border-crm-border last:border-b-0">
                {/* Main row */}
                <div className="grid grid-cols-[1fr_110px_90px_100px_130px] gap-3 px-5 py-3.5 hover:bg-gray-50 transition-colors items-center">
                  <div className="min-w-0">
                    <p className="text-xs text-text-muted font-mono">{t.taskId ?? t.id}</p>
                    <p className="text-sm font-semibold text-dark truncate mt-0.5">{t.name}</p>
                  </div>
                  <p className="text-xs text-text-muted">{t.deadline ?? '—'}</p>
                  <span className={\`inline-flex px-2.5 py-1 rounded-full text-xs font-semibold w-fit \${status.cls}\`}>
                    {status.label}
                  </span>
                  <div className="flex items-center justify-end gap-1">
                    <p className={\`text-sm font-bold \${taskPaid ? 'text-success' : 'text-dark'}\`}>
                      {amount.toLocaleString()} ֏
                    </p>
                    {taskPaid && <span className="text-[10px] text-success">✓</span>}
                  </div>
                  <div className="flex justify-center">
                    {taskPaid ? (
                      <button
                        onClick={() => openPay(t)}
                        className="px-3 py-1 text-xs font-medium rounded-full bg-success/10 text-success hover:bg-success/20 transition-colors"
                      >
                        Վճ\u561\u580վ\u561\u56e ✓
                      </button>
                    ) : (
                      <button
                        onClick={() => isOpen ? setOpenId(null) : openPay(t)}
                        className={\`px-3 py-1 text-xs font-medium rounded-full border transition-colors \${
                          isOpen
                            ? 'bg-primary text-white border-primary'
                            : 'border-crm-border text-text-muted hover:border-primary hover:text-primary'
                        }\`}
                      >
                        Վճ\u561\u580\u587լ
                      </button>
                    )}
                  </div>
                </div>

                {/* Inline payment form */}
                {isOpen && (
                  <div className="px-5 pb-4 pt-2 bg-blue-50/50 border-t border-primary/10">
                    <div className="flex items-end gap-3 flex-wrap">
                      <div className="flex flex-col gap-1">
                        <p className="text-[10px] font-semibold text-text-muted uppercase tracking-wide">Գ\u578\u582\u574\u561\u580</p>
                        <div className="flex items-center gap-1.5">
                          <input
                            type="number"
                            value={payAmount}
                            onChange={(e) => {
                              setPayAmount(e.target.value);
                              setPartial(Number(e.target.value) < amount && Number(e.target.value) > 0);
                            }}
                            className="w-36 px-3 py-1.5 text-sm rounded-xl border border-crm-border outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 bg-white"
                          />
                          <span className="text-sm text-text-muted">֏</span>
                        </div>
                        {partial && Number(payAmount) > 0 && (
                          <p className="text-[10px] text-warning">
                            Մ\u561ս\u576\u561կի \xb7 {(amount - Number(payAmount)).toLocaleString()} ֏ \u574\u576\u561\u581\u587լ \u587
                          </p>
                        )}
                      </div>
                      <button
                        onClick={() => submit(t, true)}
                        disabled={marking || !payAmount || Number(payAmount) <= 0}
                        className="px-4 py-1.5 bg-success text-white text-xs font-semibold rounded-xl hover:bg-green-600 transition-colors disabled:opacity-50"
                      >
                        {marking ? '...' : partial ? 'Մ\u561ս\u576\u561կի վճ\u561\u580\u587լ' : 'Ա\u574\u562\u578\u572ջ\u561կ\u561\u576 վճ\u561\u580\u587լ'}
                      </button>
                      <button
                        onClick={() => { setOpenId(null); setPartial(false); }}
                        disabled={marking}
                        className="px-4 py-1.5 text-xs font-medium rounded-xl border border-crm-border text-text-muted hover:bg-gray-50 transition-colors"
                      >
                        Չ\u587\u572\u561\u580կ\u587լ
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}

          {/* Footer total */}
          <div className="grid grid-cols-[1fr_110px_90px_100px_130px] gap-3 px-5 py-3 bg-gray-50 border-t border-crm-border">
            <span className="text-xs font-bold text-dark">Ե\u576\u564\u570\u561\u576\u578\u582\u580</span>
            <span /><span /><span className="text-sm font-bold text-primary text-right">{total.toLocaleString()} ֏</span>
            <span />
          </div>
        </div>
      )}
    </div>
  );
}`;

const newContent = before + newSalaryTab + '\n' + after;
fs.writeFileSync('src/features/employees/components/EmployeeProfilePage.tsx', newContent, 'utf8');
console.log('Done. Total lines:', newContent.split('\n').length);
