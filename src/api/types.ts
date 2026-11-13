import type { components } from './schema';

/** schema.d.ts 의 스키마 타입을 이름으로 꺼낸다. 응답 타입을 손으로 만들지 않는다 (TRD 10-2). */
export type Schema<Name extends keyof components['schemas']> = components['schemas'][Name];

export type Role = NonNullable<Schema<'MeResponse'>['role']>;
export type AccountStatus = NonNullable<Schema<'MeResponse'>['status']>;
