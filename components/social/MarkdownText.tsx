import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

interface MarkdownTextProps {
    content: string;
    textColor: string;
}

export default function MarkdownText({ content, textColor }: MarkdownTextProps) {
    if (!content) return null;

    // Split content into lines to handle headings
    const lines = content.split('\n');

    return (
        <View>
            {lines.map((line, lineIdx) => {
                // Check if line starts with '#' (Heading)
                if (line.trim().startsWith('#')) {
                    const headingText = line.replace(/^#+/, '').trim();
                    return (
                        <Text key={lineIdx} style={[styles.heading, { color: textColor }]}>
                            {parseInline(headingText, textColor)}
                        </Text>
                    );
                }

                return (
                    <Text key={lineIdx} style={[styles.body, { color: textColor }]}>
                        {parseInline(line, textColor)}
                    </Text>
                );
            })}
        </View>
    );
}

// Function to handle bold (*text*), italic (_text_), and strikethrough (~text~)
function parseInline(text: string, textColor: string) {
    const parts = text.split(/(\*[^*]+\*|_[^_]+_|~[^~]+~)/g);

    return parts.map((part, index) => {
        if (part.startsWith('*') && part.endsWith('*')) {
            return (
                <Text key={index} style={styles.bold}>
                    {part.slice(1, -1)}
                </Text>
            );
        }
        if (part.startsWith('_') && part.endsWith('_')) {
            return (
                <Text key={index} style={styles.italic}>
                    {part.slice(1, -1)}
                </Text>
            );
        }
        if (part.startsWith('~') && part.endsWith('~')) {
            return (
                <Text key={index} style={styles.strike}>
                    {part.slice(1, -1)}
                </Text>
            );
        }
        return part;
    });
}

const styles = StyleSheet.create({
    body: {
        fontSize: 16,
        lineHeight: 24,
        marginBottom: 4,
    },
    heading: {
        fontSize: 22,
        fontWeight: 'bold',
        marginTop: 10,
        marginBottom: 10,
    },
    bold: {
        fontWeight: 'bold',
    },
    italic: {
        fontStyle: 'italic',
    },
    strike: {
        textDecorationLine: 'line-through',
    },
});
