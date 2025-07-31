


export function createPageUrl(pageName: string) {
    // Split the pageName into path and query parts
    const [path, query] = pageName.split('?');
    
    // Convert the path part to lowercase and replace spaces with hyphens
    const formattedPath = '/' + path.toLowerCase().replace(/ /g, '-');
    
    // If there's a query string, append it
    if (query) {
        return formattedPath + '?' + query;
    }
    
    return formattedPath;
}