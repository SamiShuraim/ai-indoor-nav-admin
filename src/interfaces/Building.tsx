export interface Building {
    id: number;
    name: string;
    description?: string;
    created_at: string;
    updated_at: string;
}

export class BuildingBuilder {
    private _id!: number;
    private _name!: string;
    private _description?: string;
    private _createdAt!: string;
    private _updatedAt!: string;

    public static fromBuilding(building: Building): BuildingBuilder {
        const builder = new BuildingBuilder();
        builder._id = building.id;
        builder._name = building.name;
        builder._description = building.description;
        builder._createdAt = building.created_at;
        builder._updatedAt = building.updated_at;
        return builder;
    }

    public setId(id: number): this {
        this._id = id;
        return this;
    }

    public setName(name: string): this {
        this._name = name;
        return this;
    }

    public setDescription(description: string | undefined): this {
        this._description = description;
        return this;
    }

    public setCreatedAt(createdAt: string): this {
        this._createdAt = createdAt;
        return this;
    }

    public setUpdatedAt(updatedAt: string): this {
        this._updatedAt = updatedAt;
        return this;
    }

    public validate(): void {
        if (this._id === undefined || this._id === null) {
            throw new Error("Building ID is required");
        }
        if (!this._name || !this._name.trim()) {
            throw new Error("Building name is required");
        }
        if (!this._createdAt) {
            throw new Error("Building created_at is required");
        }
        if (!this._updatedAt) {
            throw new Error("Building updated_at is required");
        }
    }

    public build(): Building {
        this.validate();
        return {
            id: this._id,
            name: this._name,
            description: this._description,
            created_at: this._createdAt,
            updated_at: this._updatedAt,
        };
    }
}