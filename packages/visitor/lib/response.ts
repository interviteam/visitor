export class Response {
  private readonly xhr: XMLHttpRequest;

  constructor(xhr: XMLHttpRequest) {
    this.xhr = xhr;
  }

  public get status() {
    return this.xhr.status;
  }

  public get message() {
    return this.xhr.statusText;
  }

  public get data() {
    return this.xhr.response;
  }

  public get redirect() {
    return this.data.redirect;
  }

  public get visitor() {
    return this.success && !!this.xhr.getResponseHeader('x-visitor');
  }

  public get partial() {
    return this.visitor && this.success && !!this.xhr.getResponseHeader('x-partial');
  }

  public get success() {
    return this.status >= 200 && this.status < 300;
  }

  public get failed() {
    return this.status >= 400 && this.status < 600;
  }
}
