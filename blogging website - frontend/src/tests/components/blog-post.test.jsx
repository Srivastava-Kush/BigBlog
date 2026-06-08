import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, it, expect } from "vitest";
import BlogPostCard from "../../components/blog-post.component";

// ── Test fixtures ─────────────────────────────────────────────────────────────

const mockContent = {
  publishedAt: "2024-01-15T10:00:00.000Z",
  tags: ["javascript", "react"],
  title: "Introduction to React Testing",
  des: "A comprehensive guide to testing React components.",
  activity: { total_likes: 42 },
  banner: "https://example.com/banner.jpg",
  blog_id: "introduction-to-react-testing-abc123",
};

const mockAuthor = {
  profile_img: "https://example.com/avatar.png",
  fullname: "Jane Developer",
  username: "janeDev",
};

const renderCard = (contentOverrides = {}, authorOverrides = {}, props = {}) =>
  render(
    <MemoryRouter>
      <BlogPostCard
        content={{ ...mockContent, ...contentOverrides }}
        author={{ ...mockAuthor, ...authorOverrides }}
        {...props}
      />
    </MemoryRouter>,
  );

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("BlogPostCard component", () => {
  it("renders without crashing", () => {
    const { container } = renderCard();
    expect(container.firstChild).toBeTruthy();
  });

  it("displays the blog title", () => {
    renderCard();
    expect(screen.getByText("Introduction to React Testing")).toBeInTheDocument();
  });

  it("displays the blog description", () => {
    renderCard();
    expect(
      screen.getByText("A comprehensive guide to testing React components."),
    ).toBeInTheDocument();
  });

  it("displays author fullname and username", () => {
    renderCard();
    expect(screen.getByText(/Jane Developer@janeDev/i)).toBeInTheDocument();
  });

  it("displays the first tag", () => {
    renderCard();
    expect(screen.getByText("javascript")).toBeInTheDocument();
  });

  it("displays the like count", () => {
    renderCard();
    expect(screen.getByText("42")).toBeInTheDocument();
  });

  it("renders as a link to the correct blog route", () => {
    renderCard();
    const link = screen.getByRole("link");
    expect(link).toHaveAttribute(
      "href",
      "/blogs/introduction-to-react-testing-abc123",
    );
  });

  it("renders the banner image with correct src", () => {
    renderCard();
    const images = screen.getAllByRole("img");
    const banner = images.find(
      (img) => img.src === "https://example.com/banner.jpg",
    );
    expect(banner).toBeInTheDocument();
  });

  it("renders author avatar", () => {
    renderCard();
    const images = screen.getAllByRole("img");
    const avatar = images.find(
      (img) => img.src === "https://example.com/avatar.png",
    );
    expect(avatar).toBeInTheDocument();
  });

  it("shows relevance badge when relevanceScore is provided", () => {
    renderCard({}, {}, { relevanceScore: 87.5 });
    expect(screen.getByText("87.5% match")).toBeInTheDocument();
  });

  it("does not show relevance badge when relevanceScore is undefined", () => {
    renderCard();
    expect(screen.queryByText(/% match/)).toBeNull();
  });
});
