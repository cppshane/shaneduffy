import { HttpEvent, HttpHandler, HttpInterceptor, HttpRequest } from "@angular/common/http";
import { Inject, Injectable, Optional } from "@angular/core";
import { REQUEST } from "@nguniversal/express-engine/tokens";
import { Observable } from "rxjs";

interface IncomingRequest {
  protocol: string;
  get(name: string): string | undefined;
}

/** Local API used when prerendering; there is no incoming request host in that pass. */
const PRERENDER_API_ORIGIN = "http://127.0.0.1:5000";

/** Node has no page origin, so server-side renders turn /api into an absolute host. */
@Injectable()
export class ServerApiInterceptor implements HttpInterceptor {
  constructor(@Optional() @Inject(REQUEST) private request: IncomingRequest | null) {}

  intercept(req: HttpRequest<unknown>, next: HttpHandler): Observable<HttpEvent<unknown>> {
    if (!req.url.startsWith("/api/")) {
      return next.handle(req);
    }
    return next.handle(req.clone({ url: this.origin() + req.url }));
  }

  private origin(): string {
    if (!this.request) return PRERENDER_API_ORIGIN;
    const protocol = (this.request.get("x-forwarded-proto") || this.request.protocol || "https")
      .split(",")[0]
      .trim();
    const host = (this.request.get("x-forwarded-host") || this.request.get("host") || "")
      .split(",")[0]
      .trim();
    if (!protocol || !host) return PRERENDER_API_ORIGIN;
    return `${protocol}://${host}`;
  }
}
