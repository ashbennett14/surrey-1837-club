(function () {
  function element(name, className, text) {
    const node = document.createElement(name);
    if (className) node.className = className;
    if (text) node.textContent = text;
    return node;
  }

  function renderArticle(article) {
    const root = document.getElementById("guideArticle");
    root.textContent = "";

    const breadcrumb = element("nav", "guide-breadcrumb");
    breadcrumb.setAttribute("aria-label", "Breadcrumb");
    const back = element("a", "", "Initiates’ Guide");
    back.href = `initiates-guide.html#${article.sectionId}`;
    breadcrumb.append(back, document.createTextNode(" / "), element("span", "", article.section));

    const sectionImages = {
      general: { src: "assets/guide-general.jpg", alt: "An open notebook in a warm, historic meeting room" },
      surrey: { src: "assets/guide-surrey.jpg", alt: "A Surrey landscape and welcoming historic hall at golden hour" },
      lodge: { src: "assets/guide-your-lodge.jpg", alt: "Suited Lodge members preparing a meeting table together" },
      visiting: { src: "assets/guide-visiting.jpg", alt: "Two visitors arriving together at a warmly lit historic hall" },
      club: { src: "assets/guide-1837-club.jpg", alt: "A sociable group of members talking in a welcoming Surrey venue" },
      learn: { src: "assets/guide-learning.jpg", alt: "Books, a notebook and a tablet arranged for quiet study" }
    };
    const header = element("header", "guide-article-header");
    const headerCopy = element("div", "guide-article-header-copy");
    headerCopy.append(element("p", "kicker", article.section), element("h1", "", article.title), element("p", "guide-lead", article.summary));
    const imageData = sectionImages[article.sectionId];
    const headerImage = element("img", "guide-article-image");
    headerImage.src = imageData.src;
    headerImage.alt = imageData.alt;
    header.append(headerCopy, headerImage);

    const layout = element("div", "guide-article-layout");
    const content = element("article", "guide-article-content");

    article.blocks.forEach((block) => {
      const section = element("section");
      section.append(element("h2", "", block.heading));
      block.paragraphs.forEach((paragraph) => section.append(element("p", "", paragraph)));
      if (block.list) {
        const list = element(block.ordered ? "ol" : "ul");
        block.list.forEach((item) => list.append(element("li", "", item)));
        section.append(list);
      }
      content.append(section);
    });

    const aside = element("aside", "guide-article-aside");
    aside.append(element("p", "kicker", "Surrey shortcut"), element("h2", "", article.shortcut.heading), element("p", "", article.shortcut.text));
    if (article.links && article.links.length) {
      const links = element("div", "guide-resource-links");
      links.append(element("h3", "", "Useful links"));
      article.links.forEach((link) => {
        const anchor = element("a", "", link.label);
        anchor.href = link.href;
        if (link.href.startsWith("http")) {
          anchor.target = "_blank";
          anchor.rel = "noopener noreferrer";
        }
        links.append(anchor);
      });
      aside.append(links);
    }

    layout.append(content, aside);

    const next = element("nav", "guide-next", "");
    next.setAttribute("aria-label", "More from the guide");
    const all = element("a", "", "Back to all guide topics");
    all.href = `initiates-guide.html#${article.sectionId}`;
    next.append(all);

    root.append(breadcrumb, header, layout, next);
    document.title = `${article.title} | Initiates’ Guide | The Surrey 1837 Club`;
    document.querySelector('meta[name="description"]').content = article.summary;
    const canonicalUrl = new URL(window.location.href);
    canonicalUrl.hash = "";
    const absoluteImageUrl = new URL(imageData.src, window.location.href).href;
    document.querySelector('link[rel="canonical"]').href = canonicalUrl.href;
    document.querySelector('meta[property="og:title"]').content = document.title;
    document.querySelector('meta[property="og:description"]').content = article.summary;
    document.querySelector('meta[property="og:image"]').content = absoluteImageUrl;
    document.querySelector('meta[property="og:url"]').content = canonicalUrl.href;
    document.querySelector('meta[name="twitter:title"]').content = document.title;
    document.querySelector('meta[name="twitter:description"]').content = article.summary;
    document.querySelector('meta[name="twitter:image"]').content = absoluteImageUrl;
  }

  function renderNotFound() {
    const root = document.getElementById("guideArticle");
    root.textContent = "";
    root.append(element("p", "kicker", "Initiates’ Guide"), element("h1", "", "That article could not be found"));
    const link = element("a", "guide-back-button", "Browse all guide topics");
    link.href = "initiates-guide.html";
    root.append(link);
  }

  document.addEventListener("DOMContentLoaded", () => {
    const slug = new URLSearchParams(window.location.search).get("article");
    const article = window.SURREY_GUIDE_ARTICLES && window.SURREY_GUIDE_ARTICLES[slug];
    if (article) renderArticle(article);
    else renderNotFound();
  });
})();
