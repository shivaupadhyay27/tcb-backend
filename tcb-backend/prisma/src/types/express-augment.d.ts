import { Role } from '@prisma/client';

declare global {
  namespace Express {
    interface User {
      sub: string;
      role: Role;
      email: string;
    }

    interface Request {
      user?: User;
      requestId?: string;
    }
  }
}

export {};
