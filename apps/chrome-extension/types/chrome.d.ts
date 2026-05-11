declare namespace chrome {
  namespace runtime {
    const lastError: { message: string } | undefined

    namespace onMessage {
      function addListener(
        callback: (
          message: unknown,
          sender: unknown,
          sendResponse: (response?: unknown) => void,
        ) => boolean | void,
      ): void
    }
  }

  namespace tabs {
    type Tab = {
      id?: number
      url?: string
    }

    function query(queryInfo: { active: boolean; currentWindow: boolean }, callback: (tabs: Tab[]) => void): void
    function create(createProperties: { url: string }, callback: (tab: Tab) => void): void
    function sendMessage(tabId: number, message: unknown, callback: (response: unknown) => void): void
  }

  namespace scripting {
    function executeScript(
      injection: {
        target: { tabId: number }
        files: string[]
      },
      callback: (results: unknown[]) => void,
    ): void
  }
}
