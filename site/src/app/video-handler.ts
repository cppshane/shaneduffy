import { Component } from "@angular/core";

@Component({
  template: ``,
  host: {
    '(window:resize)': 'onResize()'
  }
})
export class VideoHandlerComponent {
  onResize() {
    if (typeof document !== "undefined") {
      const elements = Array.from(
        document.getElementsByClassName(
          "video-handler"
        ) as HTMLCollectionOf<HTMLElement>
      );

      /*for (let i = 0; i < elements.length; i++) {
        const parent = elements[i].parentElement;
        let width = 0;
        
        if (parent) {
          width = parent.offsetWidth - parseInt(window.getComputedStyle(parent).paddingLeft) - parseInt(window.getComputedStyle(parent).paddingRight);
        }
        else {
          width = elements[i].offsetWidth;
        }
        elements[i].style.height = `${
          width * (9.0 / 16.0)
        }px`;
      }*/
      for (let i = 0; i < elements.length; i++) {
        elements[i].style.height = `${
          elements[i].offsetWidth * (9.0 / 16.0)
        }px`;
      }
    }
  }
}
