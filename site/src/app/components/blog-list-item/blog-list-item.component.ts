import { Component, Input } from "@angular/core";
import { Post } from "src/app/models/post.model";
import { VideoHandlerComponent } from "src/app/video-handler";

@Component({
  selector: "app-blog-list-item",
  templateUrl: "./blog-list-item.component.html",
  styleUrls: ["./blog-list-item.component.css"]
})
export class BlogListItemComponent extends VideoHandlerComponent {
  @Input() blogPost?: Post;
  video: string | null = null;
  image: string | null = null;
  
  async ngOnChanges() {
    if (this.blogPost?.Image) {
      if (this.blogPost.Image.startsWith("https://www.youtube.com")) {
        if (!this.video) {
          
          this.video = this.blogPost?.Image;
        }
      }
      else {
        if (!this.image) {
          this.image = this.blogPost?.Image;
        }
      }
    }
  }

  delay(ms: number) {
    return new Promise( resolve => setTimeout(resolve, ms) );
  }

  ngAfterViewInit() {
    super.onResize();
  }
}