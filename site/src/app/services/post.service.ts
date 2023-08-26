import { HttpClient, HttpParams } from "@angular/common/http";
import { Injectable, isDevMode } from "@angular/core";
import { Post } from "../models/post.model";
import { SearchResponse } from "../models/search-response.model";

@Injectable({
  providedIn: "root",
})
export class PostService {
  baseUrl?: string;

  constructor(private httpClient: HttpClient) {
    if (isDevMode()) {
      this.baseUrl = "http://localhost:5000/api/";
    } else {
      this.baseUrl = "https://shaneduffy.io/api/";
    }
  }

  getBlogPosts(
    searchString: string,
    keywords: Array<string>,
    page: number,
    postsPerPage: number,
    callback: (result: SearchResponse) => void
  ) {
    let httpParams = new HttpParams();
    httpParams = httpParams.append("searchString", searchString);
    httpParams = httpParams.append("keywords", keywords.toString());
    httpParams = httpParams.append("page", page.toString());
    httpParams = httpParams.append("postsPerPage", postsPerPage.toString());

    this.httpClient
      .get<SearchResponse>(this.baseUrl + "post/blog", { params: httpParams })
      .subscribe(
        (result) => {
          callback(result);
        },
        (error) => {
          console.log(error);
        }
      );
  }

  getAllVideoPosts(
    page: number,
    postsPerPage: number,
    callback: (result: SearchResponse) => void
  ) {
    let httpParams = new HttpParams();
    httpParams = httpParams.append("page", page.toString());
    httpParams = httpParams.append("postsPerPage", postsPerPage.toString());

    this.httpClient
      .get<SearchResponse>(this.baseUrl + "post/videos", { params: httpParams })
      .subscribe(
        (result) => {
          callback(result);
        },
        (error) => {
          console.log(error);
        }
      );
  }

  getBlogPost(uri: string, callback: (result: Post) => void) {
    this.httpClient.get<Post>(this.baseUrl + "post/blog/" + uri).subscribe(
      (result) => {
        callback(result);
      },
      (error) => {
        console.log(error);
      }
    );
  }

  getNotesPost(uri: string, callback: (result: Post) => void) {
    this.httpClient.get<Post>(this.baseUrl + "post/notes/" + uri).subscribe(
      (result) => {
        callback(result);
      },
      (error) => {
        console.log(error);
      }
    );
  }
}