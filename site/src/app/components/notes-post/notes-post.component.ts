import { AfterViewInit, Component, Inject, OnInit, PLATFORM_ID } from "@angular/core";
import { isPlatformBrowser } from "@angular/common";
import { ActivatedRoute } from "@angular/router";
import { Post } from "../../models/post.model";
import { PostService } from "../../services/post.service";
import { Title } from "@angular/platform-browser";

declare const hljs: any;

@Component({
  selector: "app-notes-post",
  templateUrl: "./notes-post.component.html",
  styleUrls: ["./notes-post.component.css"],
})
export class NotesPostComponent implements OnInit, AfterViewInit {
  notesPost?: Post;

  constructor(
    private blogService: PostService,
    private activatedRoute: ActivatedRoute,
    private titleService: Title,
    @Inject(PLATFORM_ID) private platformId: Record<string, unknown>
  ) {}

  ngOnInit() {
    this.titleService.setTitle("Shane Duffy");

    this.activatedRoute.params.subscribe((params) => {
      if (params.uri) {
        this.blogService.getNotesPost(params.uri, (result: Post) => {
          this.notesPost = result;

          if (this.notesPost)
            this.titleService.setTitle(this.notesPost.Title);
        });
      }
    });
  }

  ngAfterViewChecked() {
    if (isPlatformBrowser(this.platformId)) {
      const codeElements = document.getElementsByTagName("code");

      for (let i = 0; i < codeElements.length; i++) {
        hljs.highlightBlock(codeElements[i]);
      }
    }
  }

  async ngAfterViewInit() {
    await this.loadMathJax();
    await this.checkMathJaxLoaded();
    await this.renderMath();
  }

  loadMathJax(): Promise<void> {
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.type = 'text/javascript';
      script.src = 'https://cdn.jsdelivr.net/npm/mathjax@3/es5/tex-mml-chtml.js';
      script.async = true;
      script.onload = () => resolve();  // Resolve when script is loaded
      script.onerror = () => reject('MathJax script failed to load');
      document.head.appendChild(script);
    });
  }

  checkMathJaxLoaded(): Promise<void> {
    return new Promise((resolve) => {
      const checkInterval = setInterval(() => {
        if ((window as any).MathJax?.typesetPromise) {
          clearInterval(checkInterval);  // Stop checking once MathJax is loaded
          resolve();
        } else {
          console.log('Still waiting for MathJax to load...');
        }
      }, 500);  // Check every 500ms
    });
  }

  async renderMath() {
    if ((window as any).MathJax?.typesetPromise) {
      try {
        await (window as any).MathJax.typesetPromise();
        console.log('MathJax typesetting complete');
      } catch (err) {
        console.error('MathJax typesetting error:', err);
      }
    } else {
      console.log('MathJax is not loaded');
    }
  }
}