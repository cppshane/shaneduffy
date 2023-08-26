﻿using MongoDB.Driver;
using System;
using System.Threading.Tasks;

using shaneduffy.Models;

namespace shaneduffy.Services
{
    public class PostService
    {
        private readonly IMongoCollection<Post> _posts;

        public PostService(IShaneDuffyDatabaseSettings settings)
        {
            _posts = new MongoClient(settings.ConnectionString)
                .GetDatabase(settings.DatabaseName)
                .GetCollection<Post>(settings.BlogPostsCollectionName);
        }

        public async Task<Post> GetBlogPost(string blogPostUri)
        {
            return await _posts.Find(post => post.Uri.Equals(blogPostUri) && post.Type.Equals("blog")).FirstOrDefaultAsync();
        }

        public async Task<SearchResponse> SearchBlogPosts(string searchString, string tags, int page, int pageCount)
        {
            if (searchString == null)
                searchString = "";
                
            searchString = searchString.ToLower();
            var result = new SearchResponse();
            result.TotalPages = (int)Math.Ceiling((double)await _posts
                .Find(post => post.Type.Equals("blog") && (post.Title.ToLower().Contains(searchString) || post.Content.ToLower().Contains(searchString)))
                .CountDocumentsAsync() / pageCount);
            result.CurrentPage = page;
            result.Posts = await _posts
                .Find(post => post.Type.Equals("blog") && (post.Title.ToLower().Contains(searchString) || post.Content.ToLower().Contains(searchString)))
                .SortByDescending(o => o.Date)
                .Skip(page * pageCount)
                .Limit(pageCount)
                .ToListAsync();

            return result;
        }

        public async Task<Post> GetNotesPost(string notesPostUri)
        {
            return await _posts.Find(post => post.Uri.Equals(notesPostUri) && post.Type.Equals("notes")).FirstOrDefaultAsync();
        }

        public async Task<SearchResponse> GetAllVideoPosts(int page, int pageCount) {
            var result = new SearchResponse();
            result.TotalPages = (int)Math.Ceiling((double)await _posts
                .Find(post => post.Video != null && post.Video != string.Empty && post.Type.Equals("blog"))
                .CountDocumentsAsync() / pageCount);
            result.CurrentPage = page;
            result.Posts = await _posts
                .Find(post => post.Video != null && post.Video != string.Empty && post.Type.Equals("blog"))
                .SortByDescending(o => o.Date)
                .Skip(page * pageCount)
                .Limit(pageCount)
                .ToListAsync();

            return result;
        }
    }
}