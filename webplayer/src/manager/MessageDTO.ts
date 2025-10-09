export class MessageDTO {
  public sender: string;
  public message: string;
  public dto?: any;

  public constructor(sender: string, message: string, dto?: any) {
    this.sender = sender;
    this.message = message;
    this.dto = dto;
  }
}
