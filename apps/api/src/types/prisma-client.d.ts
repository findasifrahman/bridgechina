declare module '@prisma/client' {
  const prismaClientPkg: any;
  export default prismaClientPkg;

  export class PrismaClient {
    constructor(options?: any);
    $disconnect(): Promise<void>;
    [key: string]: any;
  }

  export const Prisma: any;
}
