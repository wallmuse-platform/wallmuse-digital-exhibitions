import { House } from './House';

export class User {
  public id!: number;
  public name!: string;
  public country?: string;
  public age?: number;
  public domain?: string;
  /** FREE, CLI, PAY, etc */
  public type!: string;
  /** One of the houses */
  public house?: number;
  /** One of the environments */
  public environ?: number;
  public houses?: House[];

  public constructor(json?: any) {
    if (json) {
      Object.assign(this, json);
    }
    if (this.houses) {
      this.houses = this.houses.map(h => new House(h));
    }
  }
}
