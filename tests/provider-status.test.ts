import {Response} from "undici";
import {it,expect,vi} from "vitest";
import {getReply} from "../server/dialogue.js";
it("logs only a bounded HTTP code when provider rejects credentials",async()=>{
 const log=vi.spyOn(console,"warn").mockImplementation(()=>{});
 try{
  const r=await getReply({message:"你好",phase:"idle",hour:12},{apiKey:"private-test-key",fetcher:async()=>new Response("sensitive-provider-body",{status:401})});
  expect(r.provider).toBe("fallback");expect(log.mock.calls).toEqual([["[LLM] provider_http_401"]]);
 }finally{log.mockRestore();}
});
