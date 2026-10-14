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
  videoPoster: string | null = null;
  videoPlaying = false;

  ngOnChanges() {
    this.video = this.blogPost?.Video || null;
    this.image = this.video ? null : this.blogPost?.Image || null;
    this.videoPoster = null;
    this.videoPlaying = false;
    if (this.video) {
      try {
        const url = new URL(this.video);
        const host = url.hostname.replace(/^www\./, '');
        const id = host === 'youtu.be' ? url.pathname.slice(1) :
          host === 'youtube.com' ? url.searchParams.get('v') || url.pathname.split('/embed/')[1] : null;
        if (id && /^[a-zA-Z0-9_-]{11}$/.test(id)) {
          this.videoPoster = `https://i.ytimg.com/vi/${id}/hqdefault.jpg`;
          this.video = `https://www.youtube.com/embed/${id}`;
        }
      } catch { /* Keep existing non-YouTube video URLs. */ }
    }
  }

  ngAfterViewInit() { super.onResize(); }
}
