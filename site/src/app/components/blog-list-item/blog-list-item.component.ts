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
  
  ngOnChanges() {
    if (this.blogPost?.Image) {
      if (this.blogPost.Image.startsWith("https://www.youtube.com")) {
        this.video = this.blogPost?.Image;
      }
      else {
        this.image = this.blogPost?.Image;
      }
    }
  }

  ngAfterViewInit() {
    super.onResize();
  }
}