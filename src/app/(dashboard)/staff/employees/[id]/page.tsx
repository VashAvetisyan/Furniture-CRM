import EmployeeProfilePage from '@/features/employees/components/EmployeeProfilePage';

interface Props {
  params: { id: string };
}

export default function Page({ params }: Props) {
  return <EmployeeProfilePage id={params.id} />;
}
