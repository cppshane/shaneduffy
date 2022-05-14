import { Component } from "@angular/core";

import { faExternalLinkAlt } from "@fortawesome/free-solid-svg-icons";

@Component({
  selector: "app-projects",
  templateUrl: "./projects.component.html",
  styleUrls: ["./projects.component.css"],
})
export class ProjectsComponent {
  faExternalLinkAlt = faExternalLinkAlt;
}