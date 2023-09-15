import { Component } from "@angular/core";
import { Title } from "@angular/platform-browser";

@Component({
  selector: "app-crack",
  templateUrl: "./crack.component.html",
  styleUrls: ["./crack.component.css"],
})
export class CrackComponent {
  constructor(private titleService: Title) {}
  
  ngOnInit() {
    this.titleService.setTitle("crack");
  }
}