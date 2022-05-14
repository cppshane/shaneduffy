import { Component, Input } from "@angular/core";
import { Post } from "src/app/models/post.model";

@Component({
  selector: "app-blog-list-item",
  templateUrl: "./blog-list-item.component.html",
  styleUrls: ["./blog-list-item.component.css"],
})
export class BlogListItemComponent {
  @Input() blogPost?: Post;
}