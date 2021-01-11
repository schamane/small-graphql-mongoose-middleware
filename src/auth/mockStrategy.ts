import { Strategy } from 'passport';
import { values } from 'lodash';
import { ACCESS_ROLES, DEFAULT_USER_ID } from '../defaults';
import { User } from './userModel';

export type MockVerifyFunction = (username: string, password: string, done: (error: unknown, user?: unknown) => void) => unknown;

export const LocalUser: User = {
  id: DEFAULT_USER_ID,
  groups: values(ACCESS_ROLES)
};

export class MockStrategy extends Strategy {
  public name?: string;

  private mockVerify: MockVerifyFunction;

  public constructor(verify: MockVerifyFunction) {
    super();
    this.name = 'mock';
    this.mockVerify = verify;
  }

  public authenticate(): void {
    this.mockVerify(DEFAULT_USER_ID, 'password', this.verified.bind(this));
  }

  private verified(err: unknown, user?: Record<string, unknown>): void {
    if (err) {
      return this.error(err);
    }
    if (!user) {
      return this.fail('no user');
    }
    return this.success(user);
  }
}
