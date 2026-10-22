export async function getDocumentText(): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!window.Word) {
      reject(new Error("Word API not available (not running as Word Add-in)"));
      return;
    }
    
    Word.run(async (context) => {
      const body = context.document.body;
      body.load("text");
      await context.sync();
      resolve(body.text);
    }).catch(reject);
  });
}

export async function insertCommentOnText(searchString: string, commentText: string): Promise<boolean> {
  return new Promise((resolve, reject) => {
    if (!window.Word) {
      reject(new Error("Word API not available"));
      return;
    }

    Word.run(async (context) => {
      const searchResults = context.document.body.search(searchString, { matchCase: false, matchWholeWord: false });
      searchResults.load("length");
      await context.sync();

      if (searchResults.items && searchResults.items.length > 0) {
        // Just take the first match for now
        const match = searchResults.items[0];
        match.insertComment(commentText);
        await context.sync();
        resolve(true);
      } else {
        resolve(false);
      }
    }).catch(reject);
  });
}

export async function replaceTextWithTrackedChanges(searchString: string, newText: string): Promise<boolean> {
  // Word JS API currently doesn't directly expose "Turn on Track Changes" easily in standard context.
  // However, we can use track changes if they are turned on by the user, or we can use 
  // Document.changeTrackingMode in preview APIs. 
  // Let's implement text replacement. If track changes is ON in Word, this substitution will be tracked.
  return new Promise((resolve, reject) => {
     if (!window.Word) {
      reject(new Error("Word API not available"));
      return;
    }

    Word.run(async (context) => {
      const searchResults = context.document.body.search(searchString, { matchCase: false, matchWholeWord: false });
      searchResults.load("length");
      await context.sync();

      if (searchResults.items && searchResults.items.length > 0) {
        const match = searchResults.items[0];
        match.insertText(newText, Word.InsertLocation.replace);
        await context.sync();
        resolve(true);
      } else {
        resolve(false);
      }
    }).catch(reject);
  });
}
