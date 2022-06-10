import { Component } from "@angular/core";
import { NavigationEnd, Router } from "@angular/router";

declare const gtag: Function;

@Component({
  selector: "app-root",
  templateUrl: "./app.component.html",
  styleUrls: ["./app.component.css"],
})
export class AppComponent {
  constructor(public router: Router) {
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
}
