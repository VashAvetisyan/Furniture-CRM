export type Level = 'Senior' | 'Middle' | 'Junior';
export type Gender = 'Male' | 'Female';

export interface EmployeeListItem {
  id: string;
  name: string;
  email: string;
  gender: Gender;
  birthday: string;
  fullAge: number;
  position: string | number;
  level: Level;
  color: string;
  initials: string;
  onVacation?: boolean;
  isActive?: boolean;
  tasks: {
    backlog: number;
    inProgress: number;
    inReview: number;
  };
}
