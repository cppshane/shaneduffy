import { Post } from "./post.model"

export class SearchResponse {
    CurrentPage: number;
    TotalPages: number;
    Posts: Array<Post>;
}
  