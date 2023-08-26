﻿using Microsoft.AspNetCore.Mvc;
using System.Threading.Tasks;
using shaneduffy.Models;
using shaneduffy.Services;

namespace shaneduffy.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class PostController : ControllerBase
    {
        private const int DefaultPostsPerPage = 5;

        private readonly PostService _postService;

        public PostController(PostService postService)
        {
            _postService = postService;
        }

        [HttpGet("blog")]
        public async Task<SearchResponse> SearchBlogPosts(string searchString = "", int page = 0, int postsPerPage = DefaultPostsPerPage)
        {
            return await _postService.SearchBlogPosts(searchString, "", page, postsPerPage);
        }

        [HttpGet("videos")]
        public async Task<SearchResponse> GetAllVideoPosts(int page = 0, int postsPerPage = DefaultPostsPerPage)
        {
            return await _postService.GetAllVideoPosts(page, postsPerPage);
        }

        [HttpGet("blog/{uri}")]
        public async Task<Post> GetBlogPost(string uri)
        {
            return await _postService.GetBlogPost(uri);
        }

        [HttpGet("notes/{uri}")]
        public async Task<Post> GetNotesPost(string uri)
        {
            return await _postService.GetNotesPost(uri);
        }
    }
}