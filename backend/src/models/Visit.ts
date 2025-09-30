// backend/src/models/Visit.ts
export interface IVisit {
  _id?: string;
  routeId: string;
  storeId: string;
  advisorId: string;
  date: Date;
  status: 'pending' | 'in-progress' | 'completed' | 'skipped';
  startTime?: Date;
  endTime?: Date;
  duration?: number; // en minutos
  tasks: {
    evidenceBefore: { completed: boolean; photos: string[]; timestamp?: Date };
    identifySoldProducts: { completed: boolean; products: string[]; timestamp?: Date };
    picking: { completed: boolean; productsPicked: number; timestamp?: Date };
    restocking: { completed: boolean; timestamp?: Date };
    cleaning: { completed: boolean; timestamp?: Date };
    pricing: { completed: boolean; timestamp?: Date };
    evidenceAfter: { completed: boolean; photos: string[]; timestamp?: Date };
    damageCheck: { completed: boolean; damagedProducts: { code: string; photo: string }[]; timestamp?: Date };
    signature: { completed: boolean; signatureUrl?: string; timestamp?: Date };
  };
  notes?: string;
}