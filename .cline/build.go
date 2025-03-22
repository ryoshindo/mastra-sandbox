/**
 * プロンプトファイルを結合して .clinerules を生成するスクリプト
 */

package main

import (
	"bufio"
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"regexp"
	"sort"
	"strings"
)

// RooMode はカスタムモードの構造体
type RooMode struct {
	Slug           string   `json:"slug"`
	Name           string   `json:"name"`
	RoleDefinition string   `json:"roleDefinition"`
	Groups         []string `json:"groups"`
	Source         string   `json:"source,omitempty"`
	Filename       string   `json:"__filename"`
}

// RooModes はカスタムモードのリスト
type RooModes struct {
	CustomModes []RooMode `json:"customModes"`
}

// フロントマターを解析する関数（簡易版）
func parseFrontMatter(content string) (map[string]interface{}, string) {
	re := regexp.MustCompile(`(?s)^---\n(.*?)\n---\n`)
	matches := re.FindStringSubmatch(content)

	if matches == nil {
		return map[string]interface{}{}, content
	}

	// 簡易的なYAMLパーサーを実装
	parsed := make(map[string]interface{})
	scanner := bufio.NewScanner(strings.NewReader(matches[1]))

	for scanner.Scan() {
		line := scanner.Text()
		line = strings.TrimSpace(line)

		if line == "" || strings.HasPrefix(line, "#") {
			continue
		}

		parts := strings.SplitN(line, ":", 2)
		if len(parts) != 2 {
			continue
		}

		key := strings.TrimSpace(parts[0])
		value := strings.TrimSpace(parts[1])

		// 配列の処理
		if strings.HasPrefix(value, "[") && strings.HasSuffix(value, "]") {
			arrayStr := value[1 : len(value)-1]
			items := strings.Split(arrayStr, ",")
			array := make([]interface{}, 0)

			for _, item := range items {
				item = strings.TrimSpace(item)
				if item != "" {
					// 文字列の引用符を削除
					if strings.HasPrefix(item, "\"") && strings.HasSuffix(item, "\"") {
						item = item[1 : len(item)-1]
					} else if strings.HasPrefix(item, "'") && strings.HasSuffix(item, "'") {
						item = item[1 : len(item)-1]
					}
					array = append(array, item)
				}
			}

			parsed[key] = array
		} else {
			// 文字列の引用符を削除
			if strings.HasPrefix(value, "\"") && strings.HasSuffix(value, "\"") {
				value = value[1 : len(value)-1]
			} else if strings.HasPrefix(value, "'") && strings.HasSuffix(value, "'") {
				value = value[1 : len(value)-1]
			}

			parsed[key] = value
		}
	}

	// フロントマターを除去したコンテンツを返す
	cleanContent := re.ReplaceAllString(content, "")
	return parsed, cleanContent
}

func main() {
	// 現在の作業ディレクトリを取得
	cwd, err := os.Getwd()
	if err != nil {
		fmt.Printf("作業ディレクトリの取得に失敗しました: %v\n", err)
		os.Exit(1)
	}

	// 現在のディレクトリを基準にする
	// プロジェクトのルートディレクトリから実行されることを想定

	// .clineディレクトリのパスを取得
	clineDir := filepath.Join(cwd, ".cline")

	// 各ディレクトリのパスを設定
	rulesDir := filepath.Join(clineDir, "rules")
	rooModesDir := filepath.Join(clineDir, "roomodes")

	// rulesディレクトリが存在するか確認
	if _, err := os.Stat(rulesDir); os.IsNotExist(err) {
		fmt.Printf("rulesディレクトリが見つかりません: %s\n", rulesDir)
		os.Exit(1)
	}
	outputFile := filepath.Join(cwd, ".clinerules")

	// カスタムモードを格納する構造体を初期化
	roomodes := RooModes{
		CustomModes: []RooMode{},
	}

	// roomodesディレクトリが存在する場合、モードファイルを読み込む
	if _, err := os.Stat(rooModesDir); err == nil {
		entries, err := os.ReadDir(rooModesDir)
		if err != nil {
			fmt.Printf("モードディレクトリの読み込みに失敗しました: %v\n", err)
			// エラーがあっても続行する（致命的ではない）
		} else {
			for _, entry := range entries {
				if entry.IsDir() {
					continue
				}

				filePath := filepath.Join(rooModesDir, entry.Name())
				content, err := os.ReadFile(filePath)
				if err != nil {
					fmt.Printf("ファイルの読み込みに失敗しました: %v\n", err)
					continue
				}

				slug := strings.TrimSuffix(entry.Name(), ".md")
				frontMatter, body := parseFrontMatter(string(content))

				// フロントマターの内容をRooMode構造体に変換
				mode := RooMode{
					Slug:           slug,
					RoleDefinition: body,
					Filename:       filePath,
				}

				// フロントマターの内容を構造体にコピー
				if name, ok := frontMatter["name"].(string); ok {
					mode.Name = name
				}
				if groups, ok := frontMatter["groups"].([]interface{}); ok {
					for _, g := range groups {
						if groupStr, ok := g.(string); ok {
							mode.Groups = append(mode.Groups, groupStr)
						}
					}
				}
				if source, ok := frontMatter["source"].(string); ok {
					mode.Source = source
				}

				roomodes.CustomModes = append(roomodes.CustomModes, mode)
			}
		}
	}

	// rulesディレクトリからプロンプトファイルを読み込む
	var files []string
	err = filepath.Walk(rulesDir, func(path string, info os.FileInfo, err error) error {
		if err != nil {
			return err
		}

		if !info.IsDir() && strings.HasSuffix(info.Name(), ".md") {
			files = append(files, info.Name())
		}

		return nil
	})

	if err != nil {
		fmt.Printf("ディレクトリの走査中にエラーが発生しました: %v\n", err)
		os.Exit(1)
	}

	// ファイル名でソート
	sort.Strings(files)

	// 各ファイルの内容を結合
	var contents []string
	for _, file := range files {
		filePath := filepath.Join(rulesDir, file)
		content, err := os.ReadFile(filePath)
		if err != nil {
			fmt.Printf("ファイルの読み込みに失敗しました: %v\n", err)
			continue
		}

		contents = append(contents, string(content))
	}

	// 結合した内容を.clinerules に書き出し
	result := strings.Join(contents, "\n\n")

	// カスタムモードの情報を追加
	if len(roomodes.CustomModes) > 0 {
		result += "このプロジェクトには以下のモードが定義されています:"

		for _, mode := range roomodes.CustomModes {
			relPath, err := filepath.Rel(cwd, mode.Filename)
			if err != nil {
				relPath = mode.Filename
			}

			result += fmt.Sprintf("\n- %s %s at %s", mode.Slug, mode.Name, relPath)
		}
	}

	// .roomodesファイルに書き出し
	roomodesJSON, err := json.MarshalIndent(roomodes, "", "  ")
	if err != nil {
		fmt.Printf("JSONのエンコードに失敗しました: %v\n", err)
		os.Exit(1)
	}

	err = os.WriteFile(filepath.Join(cwd, ".roomodes"), roomodesJSON, 0644)
	if err != nil {
		fmt.Printf(".roomodesファイルの書き込みに失敗しました: %v\n", err)
		os.Exit(1)
	}

	fmt.Printf("Generated .roomodes from %d mode files\n", len(roomodes.CustomModes))

	// .clinerules ファイルに書き出し
	err = os.WriteFile(outputFile, []byte(result), 0644)
	if err != nil {
		fmt.Printf(".clinerules ファイルの書き込みに失敗しました: %v\n", err)
		os.Exit(1)
	}

	fmt.Printf("Generated %s from %d prompt files\n", outputFile, len(files))
}
