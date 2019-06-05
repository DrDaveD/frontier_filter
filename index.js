addEventListener('fetch', event => {
    event.respondWith(
        (async function() {
            try {
                let request = event.request
                let cache = caches.default

                // look for Pragma: no-cache in request
                // should also look for Cache-control: no-cache
                const pragma = request.headers.get('Pragma')
                if (pragma == "no-cache") {
                    await cache.delete(request)
                }

                let response = await fetch(request)
                // make the headers mutable
                response = new Response(response.body, response)
                let headers = response.headers

                const cachestatus = headers.get('CF-Cache-Status')
                if (cachestatus == "HIT") {
                    // unexpired cache match found
                    const datehdr = headers.get('X-Upstream-Date')
                    if (datehdr) {
                        let now = new Date()
                        let upstreamdate = new Date(datehdr)
                        let age = Math.floor(Math.abs(upstreamdate - now)/1000)
                        if (age > 0) {
                            headers.set('Age', age)
                        }
    // also look here for cache-control max-age
                        // unfortunately Cloudflare always overrides Date
                        //   so the following has no effect
                        // headers.set('Date', datehdr)
                    }
                }
                else {
                    // no cache match
                    const datehdr = headers.get('Date')
                    // Make a copy of the original date and store it in
                    //    the cache
                    headers.set('X-Upstream-Date', datehdr)
                    event.waitUntil(cache.put(request, response.clone()))
                }

                // let hdrstr = JSON.stringify(Object.fromEntries(response.headers))
                // headers.set('X-Debug-Headers', hdrstr)

                return response
            }
            catch(err) {
               return new Response('Worker script threw exception ' + err)
            }
        })()
    )
})

