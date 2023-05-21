import { Component } from "@angular/core";
import { Title } from "@angular/platform-browser";

@Component({
  selector: "app-knt-bot",
  templateUrl: "./knt-bot.component.html",
  styleUrls: ["./knt-bot.component.css"],
})
export class KntBotComponent {
  constructor(private titleService: Title) {}
  
  ngOnInit() {
    this.titleService.setTitle("KnT Bot");
  }
}