import {
  CheerioCrawler,
  Dataset,
  PlaywrightBrowser,
  PlaywrightCrawler,
  playwrightUtils,
  launchPlaywright,
} from "crawlee";
import problems from "./all.json" with {type: "json"};
import { mkdir, writeFile } from "node:fs/promises";

// // CheerioCrawler crawls the web using HTTP requests
// // and parses HTML using the Cheerio library.
// const crawler = new CheerioCrawler({
//   // Use the requestHandler to process each of the crawled pages.
//   async requestHandler({ request, $, enqueueLinks, log }) {
//     const probStatement = $(".challenge-body-html").html();

//     const title = $("title").text();
//     await mkdir(`./${request.url.split("/").pop()}`);
//     await writeFile(
//       `./${request.url.split("/").pop()}/problemStatement.html`,
//       probStatement,
//       "utf-8"
//     );
//     log.info(`Title of ${request.loadedUrl} is '${title}'`);

//     // Save results as JSON to ./storage/datasets/default
//     // await Dataset.pushData({ title, url: request.loadedUrl });
//   },

//   // Let's limit our crawls to make our tests shorter and safer.
//   maxRequestsPerCrawl: 500,
// });

// const crawler = new CheerioCrawler({
//   async requestHandler({ request, $, enqueueLinks, log, body, response }) {
//     if ((response.statusCode == 404)) return;
//     const { 7: problem, 9: user } = request.url.split("/");
//     console.log({ user, problem, body });
//     await writeFile(`./${problem}/${user}`, body, "utf-8");
//   },
//   additionalMimeTypes: ["text/plain"],

//   maxRequestsPerCrawl: 500,
// });

// const crawler = new PlaywrightCrawler({
//   async requestHandler({ request, $, enqueueLinks, log, body, response }) {
//     if (response.statusCode == 404) return;
//     const { 7: problem, 9: user } = request.url.split("/");
//     console.log({ user, problem, body });
//     await writeFile(`./${problem}/${user}`, body, "utf-8");
//   },
//   //   additionalMimeTypes: ["text/plain"],
//   headless: false,
//   launchContext: {
//     launchOptions: {
//       executablePath:
//         "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
//       slowMo: 50000,
//     },
//   },
//   useSessionPool: true,
//   persistCookiesPerSession: true,

//   maxRequestsPerCrawl: 500,
// });

// Add first URL to the queue and start the crawl.
// await crawler.run([
//   problems
//     .map(
//       (e) =>
//         new Request(
//           `https://www.hackerrank.com/rest/contests/master/challenges/${e}/hackers/rammmukul/download_solution`,
//           {
//             headers: {
//               Cookie:
//                 "_zitok=814423ee1b6b166516bc1726595534; hackerrank_mixpanel_token=f08c2a9f-0047-4ff8-a583-5961d54d4ca9; _gcl_au=1.1.1416857311.1735706459; user_theme=dark; react_var=false__cnt6; react_var2=false__cnt6; hrc_l_i=T; _hrank_session=1b4ee06cb3103f4d43dfbdcbfaac8d34; user_type=hacker; referrer=https://www.hackerrank.com/domains/algorithms?filters%5Bstatus%5D%5B%5D=solved&badge_type=problem-solving; homepage_variant=https://www.hackerrank.com/; _fcdscv=eyJDdXN0b21lcklkIjoiOWUyMDZiMGQtMDAxNC00MmI5LThkMzktYzJiOTA5NGEyNzMxIiwiVmlzaXRvciI6eyJFbWFpbCI6bnVsbCwiRXh0ZXJuYWxWaXNpdG9ySWQiOiJkYmYwYjJhYS00YjQ1LTQxYzYtYTM2Zi1hNTI4NjRlNGYwNjUifSwiVmlzaXRzIjpbXSwiQWN0aXZpdGllcyI6W10sIkRpYWdub3N0aWNNZXNzYWdlIjpudWxsfQ==; cebs=1; _fcdscst=MTczODAzOTQyMTQ5Mw==; _mkto_trk=id:487-WAY-049&token:_mch-hackerrank.com-37df94f5136325839aa75d4388f934cd; _hp2_id.547804831=%7B%22userId%22%3A%22141026552048662%22%2C%22pageviewId%22%3A%221800818043864024%22%2C%22sessionId%22%3A%222388595917789143%22%2C%22identity%22%3Anull%2C%22trackerVersion%22%3A%224.0%22%7D; _uetvid=90287c60751d11ef8e627924d364c8c3; cebsp_=1; _ga_BCP376TP8D=GS1.1.1738039421.2.0.1738039426.0.0.0; _ga_X2HP4BPSD7=GS1.1.1738039421.2.0.1738039426.0.0.0; _ga_0QME21KCCM=GS1.1.1738039421.2.0.1738039426.55.0.0; _ga_871V12MEY1=GS1.1.1738039421.1.0.1738039426.55.0.0; _ga_R0S46VQSNQ=GS1.1.1738039422.2.0.1738039426.56.0.0; _ce.s=v~96869e9c6332eeaa85b89957ba947007141341c2~lcw~1738039426380~vir~returning~lva~1738039422311~vpv~0~v11.cs~411501~v11.s~741f3400-dd32-11ef-bc80-d98b519c2990~v11.send~1738039424674~gtrk.la~m6fzssaz~v11.sla~1738039426381~lcw~1738039426381; _ga=GA1.2.392300149.1735706458; pagination_per_page_limit=100; __utmc=74197771; __utmz=74197771.1738303593.1.1.utmcsr=(direct)|utmccn=(direct)|utmcmd=(none); _biz_uid=c3dfc544ff994041add68e457accfe26; _biz_flagsA=%7B%22Version%22%3A1%2C%22ViewThrough%22%3A%221%22%2C%22XDomain%22%3A%221%22%7D; h_r=internal-search; h_l=_default; h_v=_default; metrics_user_identifier=17926b-7f7e36d3a079f691e35a5da79ad163f800474d0f; _gid=GA1.2.2042659863.1738443744; session_id=zxst42h8-1738449820976; __utma=74197771.392300149.1735706458.1738303593.1738449822.2; __utmb=74197771.7.10.1738449822; _biz_nA=8; _biz_pendingA=%5B%5D",
//             },
//           }
//         )
//     )
//     .pop(),
//   ...problems.map(
//     (e) =>
//       new Request(
//         `https://www.hackerrank.com/rest/contests/master/challenges/${e}/hackers/harshnikam4536/download_solution`,
//         { headers: { Cookie: "_zitok=814423ee1b6b166516bc1726595534; hackerrank_mixpanel_token=f08c2a9f-0047-4ff8-a583-5961d54d4ca9; _gcl_au=1.1.1416857311.1735706459; user_theme=dark; react_var=false__cnt6; react_var2=false__cnt6; hrc_l_i=T; _hrank_session=1b4ee06cb3103f4d43dfbdcbfaac8d34; user_type=hacker; referrer=https://www.hackerrank.com/domains/algorithms?filters%5Bstatus%5D%5B%5D=solved&badge_type=problem-solving; homepage_variant=https://www.hackerrank.com/; _fcdscv=eyJDdXN0b21lcklkIjoiOWUyMDZiMGQtMDAxNC00MmI5LThkMzktYzJiOTA5NGEyNzMxIiwiVmlzaXRvciI6eyJFbWFpbCI6bnVsbCwiRXh0ZXJuYWxWaXNpdG9ySWQiOiJkYmYwYjJhYS00YjQ1LTQxYzYtYTM2Zi1hNTI4NjRlNGYwNjUifSwiVmlzaXRzIjpbXSwiQWN0aXZpdGllcyI6W10sIkRpYWdub3N0aWNNZXNzYWdlIjpudWxsfQ==; cebs=1; _fcdscst=MTczODAzOTQyMTQ5Mw==; _mkto_trk=id:487-WAY-049&token:_mch-hackerrank.com-37df94f5136325839aa75d4388f934cd; _hp2_id.547804831=%7B%22userId%22%3A%22141026552048662%22%2C%22pageviewId%22%3A%221800818043864024%22%2C%22sessionId%22%3A%222388595917789143%22%2C%22identity%22%3Anull%2C%22trackerVersion%22%3A%224.0%22%7D; _uetvid=90287c60751d11ef8e627924d364c8c3; cebsp_=1; _ga_BCP376TP8D=GS1.1.1738039421.2.0.1738039426.0.0.0; _ga_X2HP4BPSD7=GS1.1.1738039421.2.0.1738039426.0.0.0; _ga_0QME21KCCM=GS1.1.1738039421.2.0.1738039426.55.0.0; _ga_871V12MEY1=GS1.1.1738039421.1.0.1738039426.55.0.0; _ga_R0S46VQSNQ=GS1.1.1738039422.2.0.1738039426.56.0.0; _ce.s=v~96869e9c6332eeaa85b89957ba947007141341c2~lcw~1738039426380~vir~returning~lva~1738039422311~vpv~0~v11.cs~411501~v11.s~741f3400-dd32-11ef-bc80-d98b519c2990~v11.send~1738039424674~gtrk.la~m6fzssaz~v11.sla~1738039426381~lcw~1738039426381; _ga=GA1.2.392300149.1735706458; pagination_per_page_limit=100; __utmc=74197771; __utmz=74197771.1738303593.1.1.utmcsr=(direct)|utmccn=(direct)|utmcmd=(none); _biz_uid=c3dfc544ff994041add68e457accfe26; _biz_flagsA=%7B%22Version%22%3A1%2C%22ViewThrough%22%3A%221%22%2C%22XDomain%22%3A%221%22%7D; h_r=internal-search; h_l=_default; h_v=_default; metrics_user_identifier=17926b-7f7e36d3a079f691e35a5da79ad163f800474d0f; _gid=GA1.2.2042659863.1738443744; session_id=zxst42h8-1738449820976; __utma=74197771.392300149.1735706458.1738303593.1738449822.2; __utmb=74197771.7.10.1738449822; _biz_nA=8; _biz_pendingA=%5B%5D" } }
//       )
//   ),
//   ...problems.map(
//     (e) =>
//       new Request(
//         `https://www.hackerrank.com/rest/contests/master/challenges/${e}/hackers/georgepauly1995/download_solution`,
//         { headers: { Cookie: "_zitok=814423ee1b6b166516bc1726595534; hackerrank_mixpanel_token=f08c2a9f-0047-4ff8-a583-5961d54d4ca9; _gcl_au=1.1.1416857311.1735706459; user_theme=dark; react_var=false__cnt6; react_var2=false__cnt6; hrc_l_i=T; _hrank_session=1b4ee06cb3103f4d43dfbdcbfaac8d34; user_type=hacker; referrer=https://www.hackerrank.com/domains/algorithms?filters%5Bstatus%5D%5B%5D=solved&badge_type=problem-solving; homepage_variant=https://www.hackerrank.com/; _fcdscv=eyJDdXN0b21lcklkIjoiOWUyMDZiMGQtMDAxNC00MmI5LThkMzktYzJiOTA5NGEyNzMxIiwiVmlzaXRvciI6eyJFbWFpbCI6bnVsbCwiRXh0ZXJuYWxWaXNpdG9ySWQiOiJkYmYwYjJhYS00YjQ1LTQxYzYtYTM2Zi1hNTI4NjRlNGYwNjUifSwiVmlzaXRzIjpbXSwiQWN0aXZpdGllcyI6W10sIkRpYWdub3N0aWNNZXNzYWdlIjpudWxsfQ==; cebs=1; _fcdscst=MTczODAzOTQyMTQ5Mw==; _mkto_trk=id:487-WAY-049&token:_mch-hackerrank.com-37df94f5136325839aa75d4388f934cd; _hp2_id.547804831=%7B%22userId%22%3A%22141026552048662%22%2C%22pageviewId%22%3A%221800818043864024%22%2C%22sessionId%22%3A%222388595917789143%22%2C%22identity%22%3Anull%2C%22trackerVersion%22%3A%224.0%22%7D; _uetvid=90287c60751d11ef8e627924d364c8c3; cebsp_=1; _ga_BCP376TP8D=GS1.1.1738039421.2.0.1738039426.0.0.0; _ga_X2HP4BPSD7=GS1.1.1738039421.2.0.1738039426.0.0.0; _ga_0QME21KCCM=GS1.1.1738039421.2.0.1738039426.55.0.0; _ga_871V12MEY1=GS1.1.1738039421.1.0.1738039426.55.0.0; _ga_R0S46VQSNQ=GS1.1.1738039422.2.0.1738039426.56.0.0; _ce.s=v~96869e9c6332eeaa85b89957ba947007141341c2~lcw~1738039426380~vir~returning~lva~1738039422311~vpv~0~v11.cs~411501~v11.s~741f3400-dd32-11ef-bc80-d98b519c2990~v11.send~1738039424674~gtrk.la~m6fzssaz~v11.sla~1738039426381~lcw~1738039426381; _ga=GA1.2.392300149.1735706458; pagination_per_page_limit=100; __utmc=74197771; __utmz=74197771.1738303593.1.1.utmcsr=(direct)|utmccn=(direct)|utmcmd=(none); _biz_uid=c3dfc544ff994041add68e457accfe26; _biz_flagsA=%7B%22Version%22%3A1%2C%22ViewThrough%22%3A%221%22%2C%22XDomain%22%3A%221%22%7D; h_r=internal-search; h_l=_default; h_v=_default; metrics_user_identifier=17926b-7f7e36d3a079f691e35a5da79ad163f800474d0f; _gid=GA1.2.2042659863.1738443744; session_id=zxst42h8-1738449820976; __utma=74197771.392300149.1735706458.1738303593.1738449822.2; __utmb=74197771.7.10.1738449822; _biz_nA=8; _biz_pendingA=%5B%5D" } }
//       )
//   ),
// ]);

// console.log(JSON.stringify(problems))

// const header = `"url","user","problem"
// `;
// const rows = [
//   // 'rammmukul',
//   'harshnikam4536',
//   // 'georgepauly1995',
//   // '21f30007211'
// ].flatMap(user => {
//   return problems.map(problem => `"https://www.hackerrank.com/rest/contests/master/challenges/${problem}/hackers/${user}/download_solution","${user}","${problem}"
// `)
// })

// writeFile(
//         `./problems.csv`,
//         header + rows.join(''),
//         "utf-8"
//       );

const rows = [
  // "rammmukul",
  // "harshnikam4536",
  // "georgepauly1995",
  // "21f30007211",
  // "drop_mohamedaaq1",
  "nmeera2024"
].flatMap((user) => {
  return problems.map(
    (
      problem
    ) => `"https://www.hackerrank.com/rest/contests/master/challenges/${problem}/hackers/${user}/download_solution",
`
  );
});

writeFile(`./problems.json.js`, "const urls = [\n" + rows.join("") + "\n]", "utf-8");
