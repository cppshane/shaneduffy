import { Component } from "@angular/core";
import { Title } from "@angular/platform-browser";

import { faExternalLinkAlt } from "@fortawesome/free-solid-svg-icons";

@Component({
  selector: "app-projects",
  templateUrl: "./projects.component.html",
  styleUrls: ["./projects.component.css"],
})
export class ProjectsComponent {
  faExternalLinkAlt = faExternalLinkAlt;

  constructor(private titleService: Title) { }

  ngOnInit() {
    this.titleService.setTitle("Projects");
  }
}