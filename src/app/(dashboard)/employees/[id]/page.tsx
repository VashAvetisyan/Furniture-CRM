import { redirect } from 'next/navigation';

interface Props {
  params: { id: string };
  searchParams: { [key: string]: string | string[] | undefined };
}

export default function EmployeeProfileRedirect({ params, searchParams }: Props) {
  const qs = new URLSearchParams(searchParams as Record<string, string>).toString();
  redirect(`/staff/employees/${params.id}${qs ? `?${qs}` : ''}`);
}
