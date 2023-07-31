import { Component, OnInit } from '@angular/core';
import { BotConnectorService } from '../services/bot-connector.service';

enum ChatChunkType {
  TEXT = 0,
  IMG = 1,
  MENTION = 2,
}

interface ChatChunk {
  type: ChatChunkType;
  content: string;
}

interface ChatMessage {
  chunks: ChatChunk[];
  textChunkCount: number;
  imgChunkCount: number;
}
@Component({
  selector: 'app-chat',
  templateUrl: './chat.component.html',
  styleUrls: ['./chat.component.scss']
})
export class ChatComponent implements OnInit {

  QUEUE_LENGTH: number = 25;
  messages: any[] = [];

  constructor(private botService: BotConnectorService) { }

  ngOnInit(): void {
    this.botService.getStream("chat-test-message").subscribe(data => {
      if (data.content.length > 200) {
        return;
      }

      if (data.content.legnth === 0 && data.stickers.length === 0) {
        return;
      }

      if (data.displayName.length > 12) {
        data.displayName = data.displayName.slice(0, 11);
      }

      if (data.stickers.length > 0) {
        data["stickerURL"] = data.stickers[0].url;
      } else {
        data["stickerURL"] = "";
      }

      data["badgeURL"] = "";
      data["authorColor"] = "rgb(255, 255, 255)"
      data.roles.reverse();
      for (let role of data.roles) {
        if (role.icon != null) {
          data["badgeURL"] = role.icon;
          break;
        }
      }

      for (let role of data.roles) {
        if (role.colorR != 0 || role.colorG != 0 || role.colorB != 0) {
          data["authorColor"] = `rgb(${role.colorR}, ${role.colorG}, ${role.colorB})`;
          break;
        }
      }

      const emojiChatMessage = this.processEmoijs(data.content, data.emojis);
      const chatMessage = this.processMentions(emojiChatMessage, data.mentions);

      data.chatMessage = chatMessage;

      this.messages.push(data);
      if (this.messages.length > this.QUEUE_LENGTH) {
        this.messages.shift();
      }
    });

  }

  processEmoijs(messageContent: string, emojiContent: { [key: string]: string }[]): ChatMessage {
    const chatChunks: ChatChunk[] = [];
    const emojiMap = new Map<string, string>();

    let updatedMessageContent = messageContent;

    emojiContent.forEach(emoji => {
      const emojiText = emoji["emoji_text"]
      emojiMap.set(emojiText, emoji["emoji_url"])
      // Handle issues of no space before the emoji name
      updatedMessageContent = updatedMessageContent.replaceAll(emojiText, ` ${emojiText} `)
    });

    const splitMessage = updatedMessageContent.split(" ");
    let currentTextChunk = "";
    let imgChunkCount = 0;
    let textChunkCount = 0;
    splitMessage.forEach(wordChunk => {
      if (emojiMap.has(wordChunk)) {
        if (currentTextChunk.trim() !== "") {
          chatChunks.push(
            {
              "type": ChatChunkType.TEXT,
              "content": currentTextChunk.trim()
            }
          );
          currentTextChunk = "";
          textChunkCount++;
        }
        const url = emojiMap.get(wordChunk)!;
        chatChunks.push(
          {
            "type": ChatChunkType.IMG,
            "content": url
          }
        )
        imgChunkCount++;
      } else {
        currentTextChunk += wordChunk + " ";
      }
    })

    if (currentTextChunk.trim() !== "") {
      chatChunks.push(
        {
          "type": ChatChunkType.TEXT,
          "content": currentTextChunk.trim()
        }
      )
      textChunkCount++;
    }
    return {
      chunks: chatChunks,
      imgChunkCount,
      textChunkCount
    }
  }

  processMentions(chatMessage: ChatMessage, mentionContent: { [key: string]: string }[]): ChatMessage {
    const currentChunks = chatMessage.chunks;
    const newChunks: ChatChunk[] = [];
    const mentionMap = new Map<string, string>();

    mentionContent.forEach(mention => {
      const mentionText = mention["mention_text"]
      mentionMap.set(mentionText, mention["display_name"])
      currentChunks.forEach(chunk => {
        if (chunk.type !== ChatChunkType.TEXT) return;
        chunk.content = chunk.content.replaceAll(mentionText, ` ${mentionText} `);
      })
    });

    currentChunks.forEach(chunk => {
      if (chunk.type !== ChatChunkType.TEXT) {
        newChunks.push(chunk);
        return;
      }

      let currentText = "";
      chunk.content.split(" ").forEach(word => {
        if (mentionMap.has(word)) {
          if (currentText.trim() !== "") {
            newChunks.push(
              {
                "type": ChatChunkType.TEXT,
                "content": currentText.trim()
              }
            );
            currentText = "";
          }
          const displayName = mentionMap.get(word)!;
          newChunks.push(
            {
              "type": ChatChunkType.MENTION,
              "content": displayName
            }
          )
        } else {
          currentText += word + " ";
        }
      });
      if (currentText.trim() !== "") {
        newChunks.push(
          {
            "type": ChatChunkType.TEXT,
            "content": currentText.trim()
          }
        )
      }

    })
    return {
      chunks: newChunks,
      imgChunkCount: chatMessage.imgChunkCount,
      textChunkCount: chatMessage.textChunkCount
    }
  }

  public get ChatChunkType() {
    return ChatChunkType;
  }

}