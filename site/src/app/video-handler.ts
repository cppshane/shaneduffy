import { Component, Injectable } from "@angular/core";

@Component({
  template: ``,
  host: {
    '(window:resize)': 'onResize()'
  }
})
export class VideoHandlerComponent {
  ngAfterViewInit() {
    this.onResize();
  }

  onResize() {
    if (typeof document !== "undefined") {
      const elements = Array.from(
        document.getElementsByClassName(
          "handle-video"
        ) as HTMLCollectionOf<HTMLElement>
      );

      for (let i = 0; i < elements.length; i++) {
        elements[i].style.height = `${
          elements[i].offsetWidth * (9.0 / 16.0)
        }px`;
      }
    }
  }
}
