import { redirect } from 'next/navigation';

export default function DebtRedirect() {
  redirect('/debt/customers');
}
