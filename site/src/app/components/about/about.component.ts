import { Component } from "@angular/core";
import { Title } from "@angular/platform-browser";
import { faLocationDot } from "@fortawesome/free-solid-svg-icons";

@Component({
  selector: "app-about",
  templateUrl: "./about.component.html",
  styleUrls: ["./about.component.css"],
})
export class AboutComponent {
  faLocationDot = faLocationDot;

  constructor(private titleService: Title) {}

  ngOnInit() {
    this.titleService.setTitle("About");
  }
}
