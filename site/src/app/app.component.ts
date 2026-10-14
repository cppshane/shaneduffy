import { AfterViewInit, Component, ElementRef, Inject, NgZone, OnDestroy, PLATFORM_ID, ViewChild } from "@angular/core";
import { DOCUMENT, isPlatformBrowser } from "@angular/common";
import { NavigationEnd, Router } from "@angular/router";

declare const gtag: Function;

@Component({
  selector: "app-root",
  templateUrl: "./app.component.html",
  styleUrls: ["./app.component.css"],
})
export class AppComponent implements AfterViewInit, OnDestroy {
  @ViewChild("pageEnd", { static: true }) pageEnd!: ElementRef<HTMLElement>;
  mikuVisible = false;
  mikuCursorEnabled = false;
  private endObserver?: IntersectionObserver;

  constructor(
    public router: Router,
    private zone: NgZone,
    @Inject(DOCUMENT) private document: Document,
    @Inject(PLATFORM_ID) private platformId: Record<string, unknown>
  ) {
    if (isPlatformBrowser(this.platformId)) {
      try {
        this.mikuCursorEnabled = this.document.defaultView?.sessionStorage.getItem("miku-cursor") === "true";
      } catch { /* The toggle still works when browser storage is unavailable. */ }
      this.document.body.classList.toggle("miku-cursor", this.mikuCursorEnabled);
    }
    this.router.events.subscribe((event) => {
      if (event instanceof NavigationEnd) {
        try {
          gtag("config", "G-0V2366N6PY", {
            page_path: event.urlAfterRedirects,
          });
        } catch (err) {
          // Nothing
        }
      }
    });
  }

  ngAfterViewInit() {
    if (!isPlatformBrowser(this.platformId) || typeof IntersectionObserver === "undefined") return;
    // Allow for fractional layout pixels at the maximum scroll position.
    this.endObserver = new IntersectionObserver(([entry]) => {
      this.zone.run(() => { this.mikuVisible = entry.isIntersecting; });
    }, { threshold: 1, rootMargin: "0px 0px 2px 0px" });
    this.endObserver.observe(this.pageEnd.nativeElement);
  }

  toggleMikuCursor() {
    this.mikuCursorEnabled = !this.mikuCursorEnabled;
    this.document.body.classList.toggle("miku-cursor", this.mikuCursorEnabled);
    try {
      this.document.defaultView?.sessionStorage.setItem("miku-cursor", String(this.mikuCursorEnabled));
    } catch { /* Browser storage is optional. */ }
  }

  ngOnDestroy() {
    this.document.body.classList.remove("miku-cursor");
    this.endObserver?.disconnect();
  }
}
