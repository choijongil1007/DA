
import { cleanJSONString, tryRepairJSON } from './utils.js';

const GAS_URL = 'https://script.google.com/macros/s/AKfycbzw1OjXLM2twQasXgThqq1OdOdsXm80lT5xCQxTpp8ugOtgmzx3gWqzw2QEJ2Lu0zGjDw/exec';

/**
 * Call Gemini API via Google Apps Script Proxy.
 */
export async function callGemini(promptText) {
    try {
        const response = await fetch(GAS_URL, {
            method: 'POST',
            mode: 'cors',
            headers: {
                'Content-Type': 'text/plain', 
            },
            body: JSON.stringify({
                prompt: promptText
            }),
        });

        if (!response.ok) {
            throw new Error(`AI Proxy Error: ${response.status}`);
        }

        const rawText = await response.text();
        
        if (!rawText || rawText.trim().length === 0) {
            throw new Error("AI로부터 빈 응답을 받았습니다.");
        }

        let data;
        try {
            data = JSON.parse(rawText);
        } catch (e) {
            // JSON이 아니면 일반 텍스트로 처리
            return parseResult(rawText);
        }

        // GAS 내부 에러 처리
        if (data && data.error) {
            console.error("GAS Proxy internal error:", data.error);
            throw new Error(data.error);
        }
        
        // Gemini API 전체 응답 객체가 넘어온 경우, 실제 텍스트만 추출
        if (data && data.candidates && data.candidates[0]?.content?.parts[0]?.text) {
            return parseResult(data.candidates[0].content.parts[0].text);
        }
        
        return parseResult(data);

    } catch (error) {
        console.error("GAS Proxy API Call Failed:", error);
        throw new Error(error.message || "AI 서비스 연결에 실패했습니다.");
    }
}

/**
 * Parses the raw result.
 */
function parseResult(result) {
    if (!result) return "";
    
    // 이미 원하는 데이터 객체인 경우
    if (typeof result === 'object' && !result.candidates) return result;
    
    const trimmedText = String(result).trim();
    
    // 텍스트 내부에 JSON이 포함되어 있는지 확인
    const isProbablyJSON = (trimmedText.includes('{') && trimmedText.includes('}')) || 
                           (trimmedText.includes('[') && trimmedText.includes(']'));

    if (isProbablyJSON) {
        try {
            const cleanedText = cleanJSONString(trimmedText);
            const repaired = tryRepairJSON(cleanedText);
            if (repaired) return repaired;
        } catch (e) {
            // 파싱 실패 시 원본 반환
        }
    }
    
    return trimmedText;
}
